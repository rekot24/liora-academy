// Small helpers for creating the top-level things a new family needs. The API will call
// these; the tests use them to build a second student and a second household.

import { readFile } from "node:fs/promises";

const defaults = JSON.parse(await readFile(new URL("../seed/defaults.json", import.meta.url), "utf8"));
export const DEFAULTS = defaults;

export const pgArray = (nums) => `{${nums.join(",")}}`;

// Creates a household. By default it gets the starter life-skills catalog from
// seed/defaults.json. No lessons are seeded: the lesson catalog starts empty.
export async function createHousehold(db, { name, ownerEmail = null, seedLifeSkills = true }) {
  const { rows } = await db.query("INSERT INTO households (name) VALUES ($1) RETURNING id", [name]);
  const householdId = rows[0].id;
  if (ownerEmail) {
    await db.query("INSERT INTO household_members (household_id, email, role) VALUES ($1, lower($2), 'owner')", [
      householdId,
      ownerEmail,
    ]);
  }
  if (seedLifeSkills) await insertLifeSkillCatalog(db, householdId, defaults.lifeSkills);
  return householdId;
}

// catalog shape: { "Category": [{ id, title }, ...], ... }  (id becomes legacy_id)
export async function insertLifeSkillCatalog(db, householdId, catalog) {
  const idByLegacy = new Map();
  let order = 0;
  for (const [category, items] of Object.entries(catalog)) {
    for (const item of items) {
      const { rows } = await db.query(
        "INSERT INTO life_skills (household_id, legacy_id, category, title, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [householdId, item.id ?? null, category, item.title, order++]
      );
      idByLegacy.set(item.id, rows[0].id);
    }
  }
  return idByLegacy;
}

export async function createStudent(db, { householdId, name, gradeLabel = null, email = null, sortOrder = 0 }) {
  const { rows } = await db.query(
    "INSERT INTO students (household_id, name, grade_label, email, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [householdId, name, gradeLabel, email ? email.toLowerCase() : null, sortOrder]
  );
  return rows[0].id;
}

// Finds or creates a subject by name inside a household.
export async function ensureSubject(db, householdId, name, sortOrder = null) {
  const found = await db.query("SELECT id FROM subjects WHERE household_id = $1 AND name = $2", [householdId, name]);
  if (found.rows[0]) return found.rows[0].id;
  let order = sortOrder;
  if (order === null) {
    const max = await db.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM subjects WHERE household_id = $1", [
      householdId,
    ]);
    order = max.rows[0].n;
  }
  const { rows } = await db.query("INSERT INTO subjects (household_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id", [
    householdId,
    name,
    order,
  ]);
  return rows[0].id;
}

// Puts a student into a semester with their own subject list, target days and weekly
// pattern. `pattern` is [{ subject, days: [0-6] }]; omit it to use the default pattern.
export async function enrollStudent(db, { studentId, semesterId, subjects, targetDays = null, active = false, pattern = null }) {
  const student = (await db.query("SELECT household_id FROM students WHERE id = $1", [studentId])).rows[0];
  const householdId = student.household_id;
  const { rows } = await db.query(
    "INSERT INTO enrollments (student_id, semester_id, target_days, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
    [studentId, semesterId, targetDays, active]
  );
  const enrollmentId = rows[0].id;
  let pos = 0;
  for (const name of subjects) {
    const subjectId = await ensureSubject(db, householdId, name);
    await db.query("INSERT INTO enrollment_subjects (enrollment_id, subject_id, position) VALUES ($1, $2, $3)", [
      enrollmentId,
      subjectId,
      pos++,
    ]);
  }
  pos = 0;
  for (const rule of pattern ?? defaults.weeklyPattern) {
    const subjectId = await ensureSubject(db, householdId, rule.subject);
    await db.query("INSERT INTO enrollment_pattern (enrollment_id, subject_id, days, position) VALUES ($1, $2, $3::smallint[], $4)", [
      enrollmentId,
      subjectId,
      pgArray(rule.days),
      pos++,
    ]);
  }
  return enrollmentId;
}

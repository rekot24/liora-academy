// Data operations. Each function takes a transaction handle `tx` and does one kind of change
// the portal can make. They are deliberately small and GRANULAR: a request only touches the
// rows it names, so a device holding an old copy of the data cannot overwrite newer work
// (the bug the old whole-file sync had).
//
// Conventions
//   * "key" for a lesson is the id the app uses: the lesson's legacy id if it has one, else its uuid.
//   * Merge-patch bodies: a value of null (or false for log/skill entries) means "remove it".
//   * Entries that point at a lesson or skill that no longer exists are skipped and reported
//     in `ignored`, instead of failing the whole request: a stale device is expected.

import { ensureSubject, pgArray, DEFAULTS } from "../../db/lib/households.mjs";
import { bad, isObj, reqDate, reqString, reqObject, reqArray, optInt, optString, dayList, TIME_RE, HttpError } from "./errors.mjs";

// ───────────────────────── lookups ─────────────────────────

async function lessonKeys(tx, householdId) {
  const { rows } = await tx.query("SELECT id, legacy_id FROM lessons WHERE household_id = $1", [householdId]);
  const map = new Map();
  for (const r of rows) {
    map.set(r.id, r.id);
    if (r.legacy_id) map.set(r.legacy_id, r.id);
  }
  return map;
}

async function skillKeys(tx, householdId) {
  const { rows } = await tx.query("SELECT id, legacy_id FROM life_skills WHERE household_id = $1", [householdId]);
  const map = new Map();
  for (const r of rows) {
    map.set(r.id, r.id);
    if (r.legacy_id) map.set(r.legacy_id, r.id);
  }
  return map;
}

export async function requireStudent(tx, householdId, studentId) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) throw new HttpError(404, "no such student");
  const { rows } = await tx.query("SELECT id, name, grade_label FROM students WHERE id = $1 AND household_id = $2 AND archived_at IS NULL", [studentId, householdId]);
  if (!rows[0]) throw new HttpError(404, "no such student");
  return rows[0];
}

// the text of a scheduled item: everything except the columns `id` and `date`
const frozenText = (item) => {
  const { id: _id, date: _date, ...text } = item;
  return text;
};

// ───────────────────────── completions, grades, skills, alerts ─────────────────────────

// body: { "2026-10-02": { "<lessonKey>": true | "skipped" | false | null } , "<date>": null }
export async function patchLog(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const lessons = await lessonKeys(tx, householdId);
  let applied = 0;
  const ignored = [];
  for (const [date, entries] of Object.entries(body)) {
    reqDate(date);
    if (entries === null) {
      await tx.query("DELETE FROM completions WHERE student_id = $1 AND date = $2", [studentId, date]);
      applied++;
      continue;
    }
    reqObject(entries, `log for ${date}`);
    for (const [key, value] of Object.entries(entries)) {
      const lessonId = lessons.get(key);
      if (!lessonId) { if (value) ignored.push(`${date}:${key}`); continue; }
      if (value === true || value === "skipped") {
        await tx.query(
          `INSERT INTO completions (student_id, date, lesson_id, status) VALUES ($1, $2, $3, $4)
           ON CONFLICT (student_id, date, lesson_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
          [studentId, date, lessonId, value === true ? "done" : "skipped"]
        );
      } else if (value === false || value === null) {
        await tx.query("DELETE FROM completions WHERE student_id = $1 AND date = $2 AND lesson_id = $3", [studentId, date, lessonId]);
      } else {
        throw bad(`log value for ${date}:${key} must be true, "skipped", false or null`);
      }
      applied++;
    }
  }
  return { applied, ignored };
}

// body: { "<date>": { "<lessonKey>": { type: "pass_fail", value: "pass"|"fail" } | { type: "score", value: 42, max: 50 } | null } }
export async function patchGrades(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const lessons = await lessonKeys(tx, householdId);
  let applied = 0;
  const ignored = [];
  for (const [date, entries] of Object.entries(body)) {
    reqDate(date);
    if (entries === null) {
      await tx.query("DELETE FROM grades WHERE student_id = $1 AND date = $2", [studentId, date]);
      applied++;
      continue;
    }
    reqObject(entries, `grades for ${date}`);
    for (const [key, g] of Object.entries(entries)) {
      const lessonId = lessons.get(key);
      if (!lessonId) { if (g) ignored.push(`${date}:${key}`); continue; }
      if (g === null) {
        await tx.query("DELETE FROM grades WHERE student_id = $1 AND date = $2 AND lesson_id = $3", [studentId, date, lessonId]);
      } else if (isObj(g) && g.type === "pass_fail" && (g.value === "pass" || g.value === "fail")) {
        await tx.query(
          `INSERT INTO grades (student_id, date, lesson_id, grade_type, passed, score, max_score) VALUES ($1,$2,$3,'pass_fail',$4,NULL,NULL)
           ON CONFLICT (student_id, date, lesson_id) DO UPDATE SET grade_type = 'pass_fail', passed = EXCLUDED.passed, score = NULL, max_score = NULL, updated_at = now()`,
          [studentId, date, lessonId, g.value === "pass"]
        );
      } else if (isObj(g) && g.type === "score" && Number.isFinite(Number(g.value))) {
        const max = g.max === undefined || g.max === null ? null : Number(g.max);
        await tx.query(
          `INSERT INTO grades (student_id, date, lesson_id, grade_type, passed, score, max_score) VALUES ($1,$2,$3,'score',NULL,$4,$5)
           ON CONFLICT (student_id, date, lesson_id) DO UPDATE SET grade_type = 'score', passed = NULL, score = EXCLUDED.score, max_score = EXCLUDED.max_score, updated_at = now()`,
          [studentId, date, lessonId, Number(g.value), max]
        );
      } else {
        throw bad(`grade for ${date}:${key} must be {type:"pass_fail",value:"pass"|"fail"}, {type:"score",value,max} or null`);
      }
      applied++;
    }
  }
  return { applied, ignored };
}

// body (the old flat shape): { "ls001": true, "ls001_date": "2026-10-02" }  /  { "ls001": null, "ls001_date": null }
export async function patchSkills(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const skills = await skillKeys(tx, householdId);
  let applied = 0;
  const ignored = [];
  for (const [key, value] of Object.entries(body)) {
    if (key.endsWith("_date")) continue;
    const skillId = skills.get(key);
    if (!skillId) { if (value) ignored.push(key); continue; }
    if (value === true) {
      const date = body[`${key}_date`];
      if (date !== undefined && date !== null) reqDate(date, `${key}_date`);
      await tx.query(
        `INSERT INTO life_skill_progress (student_id, life_skill_id, done_date) VALUES ($1, $2, COALESCE($3::date, current_date))
         ON CONFLICT (student_id, life_skill_id) DO UPDATE SET done_date = COALESCE($3::date, life_skill_progress.done_date)`,
        [studentId, skillId, date ?? null]
      );
    } else if (value === false || value === null) {
      await tx.query("DELETE FROM life_skill_progress WHERE student_id = $1 AND life_skill_id = $2", [studentId, skillId]);
    } else {
      throw bad(`skill ${key} must be true, false or null`);
    }
    applied++;
  }
  return { applied, ignored };
}

// body: { "2026-10-02:<lessonKey>": "09:30" | null }
export async function patchAlerts(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const lessons = await lessonKeys(tx, householdId);
  let applied = 0;
  const ignored = [];
  for (const [compound, time] of Object.entries(body)) {
    const cut = compound.indexOf(":");
    if (cut < 0) throw bad(`alert key must look like date:lesson, got ${compound}`);
    const date = reqDate(compound.slice(0, cut), "alert date");
    const lessonId = lessons.get(compound.slice(cut + 1));
    if (!lessonId) { if (time) ignored.push(compound); continue; }
    if (time === null) {
      await tx.query("DELETE FROM alerts WHERE student_id = $1 AND date = $2 AND lesson_id = $3", [studentId, date, lessonId]);
    } else {
      if (typeof time !== "string" || !TIME_RE.test(time)) throw bad(`alert time for ${compound} must look like HH:MM`);
      await tx.query(
        `INSERT INTO alerts (student_id, date, lesson_id, time) VALUES ($1,$2,$3,$4)
         ON CONFLICT (student_id, date, lesson_id) DO UPDATE SET time = EXCLUDED.time`,
        [studentId, date, lessonId, time]
      );
    }
    applied++;
  }
  return { applied, ignored };
}

// ───────────────────────── schedule and day overrides ─────────────────────────

async function insertItems(tx, table, studentId, date, items, lessons, ignored) {
  let position = 0;
  for (const item of items) {
    if (!isObj(item) || typeof item.id !== "string") throw bad(`each scheduled item on ${date} needs an id`);
    const lessonId = lessons.get(item.id);
    if (!lessonId) { ignored.push(`${date}:${item.id}`); continue; }
    await tx.query(
      `INSERT INTO ${table} (student_id, date, position, lesson_id, snapshot) VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [studentId, date, position++, lessonId, JSON.stringify(frozenText(item))]
    );
  }
}

// body: { "<date>": [ {id, title, ...}, ... ] | null }   (an array replaces that whole day; null clears it)
export async function patchSchedule(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const lessons = await lessonKeys(tx, householdId);
  let applied = 0;
  const ignored = [];
  for (const [date, items] of Object.entries(body)) {
    reqDate(date);
    await tx.query("DELETE FROM schedule_items WHERE student_id = $1 AND date = $2", [studentId, date]);
    if (items !== null) await insertItems(tx, "schedule_items", studentId, date, reqArray(items, `schedule for ${date}`), lessons, ignored);
    applied++;
  }
  return { applied, ignored };
}

// body: { "<date>": "SKIP" | [ {id, ...}, ... ] | null }
export async function patchOverrides(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const lessons = await lessonKeys(tx, householdId);
  let applied = 0;
  const ignored = [];
  for (const [date, value] of Object.entries(body)) {
    reqDate(date);
    await tx.query("DELETE FROM schedule_overrides WHERE student_id = $1 AND date = $2", [studentId, date]);
    if (value !== null) {
      if (value !== "SKIP" && !Array.isArray(value)) throw bad(`override for ${date} must be "SKIP", a list of lessons, or null`);
      await tx.query("INSERT INTO schedule_overrides (student_id, date, is_skip) VALUES ($1,$2,$3)", [studentId, date, value === "SKIP"]);
      if (Array.isArray(value)) await insertItems(tx, "schedule_override_items", studentId, date, value, lessons, ignored);
    }
    applied++;
  }
  return { applied, ignored };
}

// ───────────────────────── semesters, pattern ─────────────────────────

async function activeEnrollment(tx, studentId) {
  const { rows } = await tx.query("SELECT id FROM enrollments WHERE student_id = $1 AND is_active", [studentId]);
  return rows[0]?.id ?? null;
}

// `onlyExistingSubjects` is for the starter pattern given to a new student: it must not invent
// empty subjects in the household's catalog, so rules for subjects that do not exist are skipped.
async function writePattern(tx, householdId, enrollmentId, rules, { onlyExistingSubjects = false } = {}) {
  await tx.query("DELETE FROM enrollment_pattern WHERE enrollment_id = $1", [enrollmentId]);
  let position = 0;
  for (const rule of rules) {
    if (!isObj(rule)) throw bad("each pattern rule must be {subject, days}");
    const name = reqString(rule.subject, "pattern subject");
    if (onlyExistingSubjects) {
      const { rows } = await tx.query("SELECT 1 FROM subjects WHERE household_id = $1 AND name = $2 AND archived_at IS NULL", [householdId, name]);
      if (!rows.length) continue;
    }
    const subjectId = await ensureSubject(tx, householdId, name);
    await tx.query("INSERT INTO enrollment_pattern (enrollment_id, subject_id, days, position) VALUES ($1,$2,$3::smallint[],$4)", [
      enrollmentId,
      subjectId,
      pgArray(dayList(rule.days, `days for ${rule.subject}`)),
      position++,
    ]);
  }
}

// body: [ { subject: "Math", days: [1,3,5] }, ... ]  — the weekly pattern of the ACTIVE semester
export async function putPattern(tx, { householdId, studentId }, body) {
  reqArray(body, "body");
  const enrollmentId = await activeEnrollment(tx, studentId);
  if (!enrollmentId) throw new HttpError(409, "this student has no active semester to attach the pattern to");
  await writePattern(tx, householdId, enrollmentId, body);
  return { applied: body.length };
}

// body: {
//   semesters: { "<slug>": { id, name, mode, startDate, endDate, subjects:[...], targetDays } },   optional: add or edit these
//   remove: ["<slug>", ...],                                                                      optional: un-enroll this student
//   activeSemester: "<slug>" | null                                                               optional: omit to leave unchanged
// }
// Semester definitions are shared by the household; this student's enrollment carries their own
// subject list and target days. NOTHING is removed unless it is named in `remove`, so a device with
// an old copy cannot delete a semester someone else just added. A removed semester is deleted
// outright only if nobody else is enrolled in it.
export async function patchSemesters(tx, { householdId, studentId }, body) {
  reqObject(body, "body");
  const semesters = reqObject(body.semesters ?? {}, "semesters");
  const remove = reqArray(body.remove ?? [], "remove");
  const setsActive = Object.prototype.hasOwnProperty.call(body, "activeSemester");

  // remember the current weekly pattern before anything changes (it follows the active semester)
  const previousActive = await activeEnrollment(tx, studentId);
  const previousPattern = previousActive
    ? (await tx.query(
        "SELECT sub.name AS subject, p.days FROM enrollment_pattern p JOIN subjects sub ON sub.id = p.subject_id WHERE p.enrollment_id = $1 ORDER BY p.position",
        [previousActive]
      )).rows
    : [];

  for (const [key, sem] of Object.entries(semesters)) {
    reqObject(sem, `semester ${key}`);
    const slug = sem.id || key;
    const name = reqString(sem.name, `name of ${slug}`);
    const startDate = reqDate(sem.startDate, `startDate of ${slug}`);
    const endDate = reqDate(sem.endDate, `endDate of ${slug}`);
    const subjects = reqArray(sem.subjects ?? [], `subjects of ${slug}`);
    const { rows: s } = await tx.query(
      `INSERT INTO semesters (household_id, slug, name, mode, start_date, end_date) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (household_id, slug) DO UPDATE SET name = EXCLUDED.name, mode = EXCLUDED.mode, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, archived_at = NULL
       RETURNING id`,
      [householdId, slug, name, optString(sem.mode, "mode"), startDate, endDate]
    );
    const { rows: e } = await tx.query(
      `INSERT INTO enrollments (student_id, semester_id, target_days) VALUES ($1,$2,$3)
       ON CONFLICT (student_id, semester_id) DO UPDATE SET target_days = EXCLUDED.target_days
       RETURNING id`,
      [studentId, s[0].id, optInt(sem.targetDays, "targetDays")]
    );
    await tx.query("DELETE FROM enrollment_subjects WHERE enrollment_id = $1", [e[0].id]);
    let position = 0;
    for (const subjectName of subjects) {
      const subjectId = await ensureSubject(tx, householdId, reqString(subjectName, "subject name"));
      await tx.query("INSERT INTO enrollment_subjects (enrollment_id, subject_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [e[0].id, subjectId, position++]);
    }
  }

  for (const slug of remove) {
    const { rows } = await tx.query(
      "SELECT e.id AS enrollment_id, s.id AS semester_id FROM enrollments e JOIN semesters s ON s.id = e.semester_id WHERE e.student_id = $1 AND s.household_id = $2 AND s.slug = $3",
      [studentId, householdId, reqString(slug, "semester to remove")]
    );
    if (!rows[0]) continue;
    await tx.query("DELETE FROM enrollments WHERE id = $1", [rows[0].enrollment_id]);
    await tx.query("DELETE FROM semesters WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM enrollments WHERE semester_id = $1)", [rows[0].semester_id]);
  }

  if (setsActive) {
    await tx.query("UPDATE enrollments SET is_active = false WHERE student_id = $1", [studentId]);
    if (body.activeSemester !== null) {
      const { rows } = await tx.query(
        "SELECT e.id FROM enrollments e JOIN semesters s ON s.id = e.semester_id WHERE e.student_id = $1 AND s.household_id = $2 AND s.slug = $3",
        [studentId, householdId, reqString(body.activeSemester, "activeSemester")]
      );
      if (!rows[0]) throw bad(`activeSemester "${body.activeSemester}" is not one of this student's semesters`);
      await tx.query("UPDATE enrollments SET is_active = true WHERE id = $1", [rows[0].id]);
      // the weekly pattern follows the active semester: inherit the previous one's, or the starter pattern
      if (rows[0].id !== previousActive) {
        const { rows: has } = await tx.query("SELECT 1 FROM enrollment_pattern WHERE enrollment_id = $1 LIMIT 1", [rows[0].id]);
        if (!has.length) {
          if (previousPattern.length) await writePattern(tx, householdId, rows[0].id, previousPattern);
          else await writePattern(tx, householdId, rows[0].id, DEFAULTS.weeklyPattern, { onlyExistingSubjects: true });
        }
      }
    }
  }
  return { applied: Object.keys(semesters).length + remove.length };
}

// ───────────────────────── lists and settings ─────────────────────────

const TRIP_KNOWN = new Set(["date", "place", "subjects", "notes", "countsAttendance"]);
const ACTIVITY_KNOWN = new Set(["name", "type", "days", "time", "location", "notes"]);
const extras = (obj, known) => Object.fromEntries(Object.entries(obj).filter(([k]) => !known.has(k)));

// body: { upsert: [ { id, date, place, subjects, notes, countsAttendance } ], remove: ["<id>", ...] }
// Each trip is identified by the id the app gave it. Only the trips named are touched, so a device
// with an old list cannot delete trips added elsewhere.
export async function patchFieldTrips(tx, { studentId }, body) {
  reqObject(body, "body");
  let applied = 0;
  for (const t of reqArray(body.upsert ?? [], "upsert")) {
    reqObject(t, "field trip");
    const id = reqString(t.id, "field trip id");
    const values = [reqDate(t.date, "trip date"), reqString(t.place, "trip place"), optString(t.subjects, "subjects"), optString(t.notes, "notes"), t.countsAttendance !== false, JSON.stringify(extras(t, TRIP_KNOWN))];
    const found = await tx.query("SELECT id FROM field_trips WHERE student_id = $1 AND meta->>'id' = $2", [studentId, id]);
    if (found.rows[0]) {
      await tx.query("UPDATE field_trips SET trip_date = $2, place = $3, subjects = $4, notes = $5, counts_attendance = $6, meta = $7::jsonb WHERE id = $1", [found.rows[0].id, ...values]);
    } else {
      await tx.query(
        `INSERT INTO field_trips (student_id, trip_date, place, subjects, notes, counts_attendance, meta, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,(SELECT COALESCE(MAX(position), -1) + 1 FROM field_trips WHERE student_id = $1))`,
        [studentId, ...values]
      );
    }
    applied++;
  }
  for (const id of reqArray(body.remove ?? [], "remove")) {
    await tx.query("DELETE FROM field_trips WHERE student_id = $1 AND meta->>'id' = $2", [studentId, reqString(id, "field trip id")]);
    applied++;
  }
  return { applied };
}

// body: { upsert: [ { id, name, type, days:[0-6], time, location, notes } ], remove: ["<id>", ...] }
export async function patchExtracurriculars(tx, { studentId }, body) {
  reqObject(body, "body");
  let applied = 0;
  for (const a of reqArray(body.upsert ?? [], "upsert")) {
    reqObject(a, "activity");
    const id = reqString(a.id, "activity id");
    const values = [reqString(a.name, "activity name"), optString(a.type, "type"), pgArray(dayList(a.days, "days")), optString(a.time, "time"), optString(a.location, "location"), optString(a.notes, "notes"), JSON.stringify(extras(a, ACTIVITY_KNOWN))];
    const found = await tx.query("SELECT id FROM extracurriculars WHERE student_id = $1 AND meta->>'id' = $2", [studentId, id]);
    if (found.rows[0]) {
      await tx.query("UPDATE extracurriculars SET name = $2, type = $3, days = $4::smallint[], time = $5, location = $6, notes = $7, meta = $8::jsonb WHERE id = $1", [found.rows[0].id, ...values]);
    } else {
      await tx.query(
        `INSERT INTO extracurriculars (student_id, name, type, days, time, location, notes, meta, position)
         VALUES ($1,$2,$3,$4::smallint[],$5,$6,$7,$8::jsonb,(SELECT COALESCE(MAX(position), -1) + 1 FROM extracurriculars WHERE student_id = $1))`,
        [studentId, ...values]
      );
    }
    applied++;
  }
  for (const id of reqArray(body.remove ?? [], "remove")) {
    await tx.query("DELETE FROM extracurriculars WHERE student_id = $1 AND meta->>'id' = $2", [studentId, reqString(id, "activity id")]);
    applied++;
  }
  return { applied };
}

// body: { label, status: "pending"|"scheduled"|"completed", dueDate, showFrom }
export async function putEvaluation(tx, { studentId }, body) {
  reqObject(body, "body");
  const status = body.status ?? "pending";
  if (!["pending", "scheduled", "completed"].includes(status)) throw bad('status must be "pending", "scheduled" or "completed"');
  const dueDate = body.dueDate ? reqDate(body.dueDate, "dueDate") : null;
  const showFrom = body.showFrom ? reqDate(body.showFrom, "showFrom") : null;
  await tx.query(
    `INSERT INTO evaluations (student_id, label, status, due_date, show_from) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (student_id) DO UPDATE SET label = EXCLUDED.label, status = EXCLUDED.status, due_date = EXCLUDED.due_date, show_from = EXCLUDED.show_from`,
    [studentId, optString(body.label, "label"), status, dueDate, showFrom]
  );
  return { applied: 1 };
}

// body: { browser: true, apollo: true }
export async function putAlertSettings(tx, { studentId }, body) {
  reqObject(body, "body");
  await tx.query(
    `INSERT INTO alert_settings (student_id, browser, apollo) VALUES ($1,$2,$3)
     ON CONFLICT (student_id) DO UPDATE SET browser = EXCLUDED.browser, apollo = EXCLUDED.apollo`,
    [studentId, body.browser !== false, body.apollo !== false]
  );
  return { applied: 1 };
}

// ───────────────────────── household catalogs ─────────────────────────

// body: { upsert: [ { id, category, title } ], remove: ["<id>", ...], order: ["<id>", ...] }
// Only the skills named are touched. A removed skill is deleted if nobody has progress on it,
// archived otherwise (so a student's record of having learned it is never lost).
export async function patchLifeSkills(tx, { householdId }, body) {
  reqObject(body, "body");
  const keys = await skillKeys(tx, householdId);
  let removed = 0;
  let archived = 0;
  let applied = 0;
  for (const item of reqArray(body.upsert ?? [], "upsert")) {
    reqObject(item, "skill");
    const key = reqString(item.id, "skill id");
    const category = reqString(item.category, `category of ${key}`);
    const title = reqString(item.title, `title of ${key}`);
    if (keys.has(key)) {
      await tx.query("UPDATE life_skills SET category = $2, title = $3, archived_at = NULL WHERE id = $1", [keys.get(key), category, title]);
    } else {
      const { rows } = await tx.query(
        "INSERT INTO life_skills (household_id, legacy_id, category, title, sort_order) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(sort_order), -1) + 1 FROM life_skills WHERE household_id = $1)) RETURNING id",
        [householdId, key, category, title]
      );
      keys.set(key, rows[0].id);
    }
    applied++;
  }
  for (const key of reqArray(body.remove ?? [], "remove")) {
    const id = keys.get(key);
    if (!id) continue;
    const { rows } = await tx.query("SELECT 1 FROM life_skill_progress WHERE life_skill_id = $1 LIMIT 1", [id]);
    if (rows.length) {
      await tx.query("UPDATE life_skills SET archived_at = COALESCE(archived_at, now()) WHERE id = $1", [id]);
      archived++;
    } else {
      await tx.query("DELETE FROM life_skills WHERE id = $1", [id]);
      removed++;
    }
  }
  if (body.order !== undefined) {
    let position = 0;
    for (const key of reqArray(body.order, "order")) {
      const id = keys.get(key);
      if (id) await tx.query("UPDATE life_skills SET sort_order = $2 WHERE id = $1", [id, position++]);
    }
  }
  return { applied, removed, archived };
}

const LESSON_COLUMNS = {
  title: "title", platform: "platform", description: "description", level: "level",
  estMin: "est_min", seq: "seq", gradingType: "grading_type", gradeMax: "grade_max",
};
const LESSON_KNOWN = new Set(["id", "subject", ...Object.keys(LESSON_COLUMNS)]);

// body: {
//   subjects: ["Math", "Reading", ...],                       optional: subject display order
//   lessons: { upsert: [ {id, subject, title, platform, ...} ], remove: ["<lessonKey>", ...] },
//   order: { "Math": ["<lessonKey>", ...] }                   optional: lesson order within a subject
// }
// Removing a lesson nobody has used deletes it; one that was scheduled, completed or graded is archived.
export async function patchCatalog(tx, { householdId }, body) {
  reqObject(body, "body");
  const result = { upserted: 0, removed: {}, created: [] };

  if (body.subjects !== undefined) {
    let i = 0;
    for (const name of reqArray(body.subjects, "subjects")) {
      const subjectId = await ensureSubject(tx, householdId, reqString(name, "subject name"));
      await tx.query("UPDATE subjects SET sort_order = $2, archived_at = NULL WHERE id = $1", [subjectId, i++]);
    }
  }

  const lessons = body.lessons ?? {};
  const map = await lessonKeys(tx, householdId);
  for (const item of reqArray(lessons.upsert ?? [], "lessons.upsert")) {
    reqObject(item, "lesson");
    const existingId = typeof item.id === "string" ? map.get(item.id) : undefined;
    const sets = [];
    const values = [];
    const push = (column, value) => { values.push(value); sets.push([column, `$${values.length + 1}`]); };
    for (const [field, column] of Object.entries(LESSON_COLUMNS)) {
      if (item[field] === undefined) continue;
      const v = item[field];
      if (field === "title") reqString(v, "title");
      else if (["estMin", "seq", "gradeMax"].includes(field)) optInt(v, field);
      else optString(v, field);
      push(column, v);
    }
    if (item.subject !== undefined) push("subject_id", await ensureSubject(tx, householdId, reqString(item.subject, "subject")));
    const metaExtras = extras(item, LESSON_KNOWN);

    if (existingId) {
      let query = `UPDATE lessons SET updated_at = now(), archived_at = NULL${sets.map(([c, p]) => `, ${c} = ${p}`).join("")}`;
      if (Object.keys(metaExtras).length) { values.push(JSON.stringify(metaExtras)); query += `, meta = meta || $${values.length + 1}::jsonb`; }
      await tx.query(`${query} WHERE id = $1`, [existingId, ...values]);
    } else {
      if (item.title === undefined || item.subject === undefined) throw bad("a new lesson needs a title and a subject");
      const subjectId = values[sets.findIndex(([c]) => c === "subject_id")];
      const cols = sets.map(([c]) => c);
      const placeholders = sets.map((_, i) => `$${i + 4}`);
      const { rows } = await tx.query(
        `INSERT INTO lessons (household_id, legacy_id, position, meta${cols.map((c) => `, ${c}`).join("")})
         VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM lessons WHERE household_id = $1 AND subject_id = $${values.length + 4}), $3::jsonb${placeholders.map((p) => `, ${p}`).join("")})
         RETURNING id`,
        [householdId, typeof item.id === "string" ? item.id : null, JSON.stringify(metaExtras), ...values, subjectId]
      );
      if (typeof item.id !== "string") result.created.push(rows[0].id);
      map.set(typeof item.id === "string" ? item.id : rows[0].id, rows[0].id);
    }
    result.upserted++;
  }

  for (const key of reqArray(lessons.remove ?? [], "lessons.remove")) {
    const lessonId = map.get(key);
    if (!lessonId) { result.removed[key] = "missing"; continue; }
    const { rows } = await tx.query("SELECT remove_or_archive_lesson($1) AS outcome", [lessonId]);
    result.removed[key] = rows[0].outcome;
  }

  if (body.order !== undefined) {
    for (const [, keys] of Object.entries(reqObject(body.order, "order"))) {
      let position = 0;
      for (const key of reqArray(keys, "order list")) {
        const lessonId = map.get(key);
        if (lessonId) await tx.query("UPDATE lessons SET position = $2 WHERE id = $1", [lessonId, position++]);
      }
    }
  }
  return result;
}

// ───────────────────────── students ─────────────────────────

// body: { name, gradeLabel?, email? }   (a new student starts with no semesters; enroll them with putSemesters)
export async function createStudent(tx, { householdId }, body) {
  reqObject(body, "body");
  const name = reqString(body.name, "name");
  const email = body.email ? reqString(body.email, "email").toLowerCase() : null;
  const { rows: dup } = await tx.query("SELECT 1 FROM students WHERE household_id = $1 AND name = $2", [householdId, name]);
  if (dup.length) throw new HttpError(409, `a student named ${name} already exists`);
  const { rows } = await tx.query(
    "INSERT INTO students (household_id, name, grade_label, email, sort_order) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(sort_order), -1) + 1 FROM students WHERE household_id = $1)) RETURNING id",
    [householdId, name, optString(body.gradeLabel, "gradeLabel"), email]
  );
  await tx.query("INSERT INTO evaluations (student_id, label, status) VALUES ($1, NULL, 'pending')", [rows[0].id]);
  await tx.query("INSERT INTO alert_settings (student_id) VALUES ($1)", [rows[0].id]);
  return { id: rows[0].id, name };
}

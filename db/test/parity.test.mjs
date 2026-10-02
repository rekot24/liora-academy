// Run:  npm test            (synthetic fixture only)
//       LEGACY_BACKUP=/path/to/liora-academy-backup.json npm test   (also checks a real export)
//
// Real exports hold a child's school records. Keep them OUT of the repo (this repo is
// public); point LEGACY_BACKUP at a local file instead.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../lib/migrate.mjs";
import { importLegacySnapshot, exportLegacySnapshot, LEGACY_FALLBACKS } from "../lib/legacy.mjs";
import { DEFAULTS, createHousehold, createStudent, enrollStudent } from "../lib/households.mjs";

async function freshDb() {
  const db = new PGlite();
  await migrate(db);
  return db;
}

// ── synthetic snapshot that exercises every shape the old app could save ──
function syntheticSnapshot() {
  const lesson = (id, subject, n, extra = {}) => ({ id, subject, title: `${subject} lesson ${n}`, platform: "Test Platform", description: `desc ${n}`, level: "5th grade", estMin: 20 + n, seq: n, ...extra });
  const assignments = {
    Math: [lesson("m1", "Math", 1), lesson("m2", "Math", 2, { gradingType: "score", gradeMax: 50 }), lesson("m3", "Math", 3, { gradingType: "pass_fail" })],
    Reading: [lesson("r1", "Reading", 1), lesson("r2", "Reading", 2, { someFutureField: { nested: true } })],
    Science: [], // a subject with no lessons yet (like Math today in the real data)
  };
  const day = (date, ids) => ids.map((id) => ({ ...Object.values(assignments).flat().find((l) => l.id === id), date }));
  return {
    exportedAt: "2026-10-02T18:59:56.553Z",
    semesters: {
      "2026-summer": { id: "2026-summer", name: "Summer", mode: "lite", startDate: "2026-05-01", endDate: "2026-07-31", subjects: ["Math"], targetDays: 60, active: false },
      "2026-fall": { id: "2026-fall", name: "Fall 2026", mode: "full", startDate: "2026-08-04", endDate: "2026-12-19", subjects: ["Math", "Reading", "Science"], targetDays: 86, active: true, customNote: "kept in meta" },
    },
    activeSemester: "2026-fall",
    assignments,
    schedule: {
      "2026-08-10": day("2026-08-10", ["m1", "r1"]),
      "2026-08-11": day("2026-08-11", ["m2"]),
      "2026-08-12": day("2026-08-12", ["m3", "r2"]),
    },
    overrides: { "2026-08-13": "SKIP", "2026-08-14": day("2026-08-14", ["r1"]) },
    pattern: [{ subject: "Math", days: [1, 3, 5] }, { subject: "Reading", days: [0, 1, 2, 3, 4, 5, 6] }, { subject: "Science", days: [2, 4] }],
    log: {
      "2026-08-10": { m1: true, r1: false },
      "2026-08-11": { m2: "skipped" },
      "2026-08-12": { m3: true, ghost: true }, // ghost = lesson that no longer exists -> dropped
      "2026-08-09": { m1: false },             // only false entries -> day disappears
    },
    grades: {
      "2026-08-11": { m2: { type: "score", value: 42, max: 50 } },
      "2026-08-12": { m3: { type: "pass_fail", value: "fail" }, ghost: { type: "pass_fail", value: "pass" } },
    },
    skills: { ls001: true, ls001_date: "2026-08-12", ls002: false, ls002_date: "2026-08-12" },
    skillsCatalog: { Kitchen: [{ id: "ls001", title: "Knife skills" }, { id: "ls002", title: "Cook a meal" }], Auto: [{ id: "ls003", title: "Check oil" }] },
    fieldTrips: [{ id: "ft1", date: "2026-09-01", place: "Museum", subjects: "History", notes: "fun", countsAttendance: true }, { date: "2026-09-15", place: "Park", countsAttendance: false }],
    extracurriculars: [{ id: "ex1", name: "Swim", type: "Sport", days: [2, 4], time: "16:00", location: "Rec center", notes: "" }],
    evaluation: { label: "Annual evaluation", status: "scheduled", dueDate: "2027-04-30", showFrom: "2027-03-01" },
    alerts: { "2026-08-10:m1": "09:30", "2026-08-10:ghost": "10:00" },
    alertSettings: { browser: false, apollo: true },
    missed: null,
  };
}

// What the rebuilt snapshot should look like, given the agreed import rules.
function expectedAfterImport(snap) {
  const s = structuredClone(snap);
  delete s.exportedAt; delete s.missed;
  s.skillsCatalog ??= DEFAULTS.lifeSkills;
  s.evaluation ??= LEGACY_FALLBACKS.evaluation;
  s.alertSettings ??= LEGACY_FALLBACKS.alertSettings;
  s.grades ??= {}; s.alerts ??= {}; s.fieldTrips ??= []; s.extracurriculars ??= [];
  s.overrides = Array.isArray(s.overrides) ? {} : s.overrides ?? {};
  const known = new Set(Object.values(s.assignments).flat().map((l) => l.id));
  for (const [d, entries] of Object.entries(s.log ?? {})) {
    const kept = Object.fromEntries(Object.entries(entries).filter(([id, v]) => v && known.has(id)));
    if (Object.keys(kept).length) s.log[d] = kept; else delete s.log[d];
  }
  s.log ??= {};
  for (const [d, entries] of Object.entries(s.grades)) {
    const kept = Object.fromEntries(Object.entries(entries).filter(([id]) => known.has(id)));
    if (Object.keys(kept).length) s.grades[d] = kept; else delete s.grades[d];
  }
  s.alerts = Object.fromEntries(Object.entries(s.alerts).filter(([k]) => known.has(k.slice(k.indexOf(":") + 1))));
  const skills = {};
  for (const [k, v] of Object.entries(s.skills ?? {})) {
    if (k.endsWith("_date")) continue;
    if (v === true) { skills[k] = true; skills[`${k}_date`] = s.skills[`${k}_date`]; }
  }
  s.skills = skills;
  return s;
}

test("migrations apply once and are idempotent", async () => {
  const db = new PGlite();
  const first = await migrate(db);
  assert.deepEqual(first, ["001_init.sql"]);
  assert.deepEqual(await migrate(db), []);
});

test("parity: synthetic snapshot round-trips through the tables", async () => {
  const db = await freshDb();
  const snap = syntheticSnapshot();
  const { studentId, report } = await importLegacySnapshot(db, snap, { householdName: "Test family", studentName: "Liora", gradeLabel: "7th" });
  assert.deepEqual(report.dropped.log, ["2026-08-12:ghost"]);
  assert.deepEqual(report.dropped.grades, ["2026-08-12:ghost"]);
  assert.deepEqual(report.dropped.alerts, ["2026-08-10:ghost"]);
  assert.equal(report.scheduleDrift.length, 0);
  const rebuilt = await exportLegacySnapshot(db, studentId);
  assert.deepStrictEqual(rebuilt, expectedAfterImport(snap));
});

test("parity: your real export round-trips (set LEGACY_BACKUP to run)", { skip: !process.env.LEGACY_BACKUP }, async () => {
  const db = await freshDb();
  const snap = JSON.parse(await readFile(process.env.LEGACY_BACKUP, "utf8"));
  const { studentId, report } = await importLegacySnapshot(db, snap, { householdName: "Real", studentName: "Liora", gradeLabel: "7th" });
  console.log("  import report:", JSON.stringify({ counts: report.counts, dropped: report.dropped, warnings: report.warnings, scheduleDrift: report.scheduleDrift.length }));
  const rebuilt = await exportLegacySnapshot(db, studentId);
  assert.deepStrictEqual(rebuilt, expectedAfterImport(snap));
});

test("a failed import leaves nothing behind (atomic)", async () => {
  const db = await freshDb();
  const snap = syntheticSnapshot();
  delete snap.semesters["2026-fall"].startDate; // NOT NULL violation partway through
  await assert.rejects(importLegacySnapshot(db, snap, { householdName: "Broken", studentName: "Liora" }));
  for (const t of ["households", "students", "lessons", "semesters", "life_skills"]) {
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n, 0, `${t} should be empty`);
  }
});

test("lessons: unused ones are deleted, used ones are archived", async () => {
  const db = await freshDb();
  const snap = syntheticSnapshot();
  const { householdId, studentId } = await importLegacySnapshot(db, snap, { householdName: "T", studentName: "Liora" });
  const id = async (legacy) => (await db.query("SELECT id FROM lessons WHERE household_id = $1 AND legacy_id = $2", [householdId, legacy])).rows[0].id;

  // Unscheduled, never completed lesson: add one and remove it -> truly gone.
  const sub = (await db.query("SELECT id FROM subjects WHERE household_id = $1 AND name = 'Math'", [householdId])).rows[0].id;
  const fresh = (await db.query("INSERT INTO lessons (household_id, subject_id, title) VALUES ($1,$2,'Unused') RETURNING id", [householdId, sub])).rows[0].id;
  assert.equal((await db.query("SELECT remove_or_archive_lesson($1) AS r", [fresh])).rows[0].r, "deleted");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lessons WHERE id = $1", [fresh])).rows[0].n, 0);

  // Scheduled lesson (m1) -> archived, hidden from catalog, still visible in the schedule.
  assert.equal((await db.query("SELECT remove_or_archive_lesson($1) AS r", [await id("m1")])).rows[0].r, "archived");
  const out = await exportLegacySnapshot(db, studentId);
  assert.ok(!out.assignments.Math.some((l) => l.id === "m1"), "archived lesson hidden from catalog");
  assert.ok(out.schedule["2026-08-10"].some((l) => l.id === "m1"), "history keeps the lesson");

  // Graded-only lesson is protected too (grades reference it).
  assert.equal((await db.query("SELECT remove_or_archive_lesson($1) AS r", [await id("m2")])).rows[0].r, "archived");
  // Unknown id
  assert.equal((await db.query("SELECT remove_or_archive_lesson(gen_random_uuid()) AS r")).rows[0].r, "missing");
});

test("lessons: an imported sheet can be removed as a batch", async () => {
  const db = await freshDb();
  const { householdId } = await importLegacySnapshot(db, syntheticSnapshot(), { householdName: "T", studentName: "Liora" });
  const sub = (await db.query("SELECT id FROM subjects WHERE household_id = $1 AND name = 'Reading'", [householdId])).rows[0].id;
  const batch = (await db.query("INSERT INTO import_batches (household_id, label) VALUES ($1,'sheet.csv') RETURNING id", [householdId])).rows[0].id;
  for (const t of ["a", "b", "c"]) await db.query("INSERT INTO lessons (household_id, subject_id, title, import_batch_id) VALUES ($1,$2,$3,$4)", [householdId, sub, t, batch]);
  // schedule one of them for the student so it is "used"
  const used = (await db.query("SELECT id FROM lessons WHERE title = 'a'")).rows[0].id;
  const studentId = (await db.query("SELECT id FROM students LIMIT 1")).rows[0].id;
  await db.query("INSERT INTO schedule_items (student_id, date, position, lesson_id) VALUES ($1,'2026-09-30',0,$2)", [studentId, used]);
  const r = (await db.query("SELECT * FROM remove_import_batch($1)", [batch])).rows[0];
  assert.deepEqual({ deleted: r.deleted, archived: r.archived }, { deleted: 2, archived: 1 });
});

test("growth: a second student shares the catalog but keeps separate progress", async () => {
  const db = await freshDb();
  const { householdId, studentId: liora } = await importLegacySnapshot(db, syntheticSnapshot(), { householdName: "T", studentName: "Liora" });
  const amari = await createStudent(db, { householdId, name: "Amari", gradeLabel: "8th" });
  const spring = (await db.query("INSERT INTO semesters (household_id, slug, name, mode, start_date, end_date) VALUES ($1,'2027-spring','Spring 2027','full','2027-01-11','2027-05-28') RETURNING id", [householdId])).rows[0].id;
  await enrollStudent(db, { studentId: amari, semesterId: spring, subjects: ["Math", "Reading"], targetDays: 80, active: true });

  const m1 = (await db.query("SELECT id FROM lessons WHERE household_id = $1 AND legacy_id = 'm1'", [householdId])).rows[0].id;
  await db.query("INSERT INTO schedule_items (student_id, date, position, lesson_id) VALUES ($1,'2026-08-10',0,$2)", [amari, m1]);
  await db.query("INSERT INTO completions (student_id, date, lesson_id, status) VALUES ($1,'2026-08-10',$2,'skipped')", [amari, m1]);

  const a = await exportLegacySnapshot(db, amari);
  const l = await exportLegacySnapshot(db, liora);
  assert.deepEqual(a.assignments, l.assignments, "same catalog");
  assert.equal(l.log["2026-08-10"].m1, true, "Liora's completion untouched");
  assert.equal(a.log["2026-08-10"].m1, "skipped", "Amari's completion is her own");
  assert.equal(a.activeSemester, "2027-spring");
  assert.equal(l.activeSemester, "2026-fall");
  assert.deepEqual(Object.keys(a.semesters), ["2027-spring"], "Amari is only enrolled in spring");

  // one active enrollment per student is enforced by the database
  const fall = (await db.query("SELECT id FROM semesters WHERE household_id = $1 AND slug = '2026-fall'", [householdId])).rows[0].id;
  await assert.rejects(enrollStudent(db, { studentId: amari, semesterId: fall, subjects: ["Math"], active: true }));
});

test("growth: households are isolated and new ones start with defaults, not lessons", async () => {
  const db = await freshDb();
  await importLegacySnapshot(db, syntheticSnapshot(), { householdName: "Family A", studentName: "Liora" });
  const b = await createHousehold(db, { name: "Family B", ownerEmail: "Parent@Example.com" });
  const kid = await createStudent(db, { householdId: b, name: "Sam" });
  const out = await exportLegacySnapshot(db, kid);
  assert.deepEqual(out.assignments, {}, "no lessons leak across households or are pre-seeded");
  assert.deepEqual(out.skillsCatalog, DEFAULTS.lifeSkills, "life-skills defaults seeded");
  assert.equal((await db.query("SELECT email FROM household_members WHERE household_id = $1", [b])).rows[0].email, "parent@example.com", "emails are lower-cased");
  // Same legacy ids may exist in two households without colliding.
  const sub = (await db.query("INSERT INTO subjects (household_id, name) VALUES ($1,'Math') RETURNING id", [b])).rows[0].id;
  await db.query("INSERT INTO lessons (household_id, legacy_id, subject_id, title) VALUES ($1,'m1',$2,'B lesson')", [b, sub]);
});

test("history: editing the catalog never rewrites what was assigned or completed", async () => {
  const db = await freshDb();
  const { householdId, studentId } = await importLegacySnapshot(db, syntheticSnapshot(), { householdName: "T", studentName: "Liora" });
  const lid = async (legacy) => (await db.query("SELECT id FROM lessons WHERE household_id = $1 AND legacy_id = $2", [householdId, legacy])).rows[0].id;
  const m1 = await lid("m1"), r2 = await lid("r2");

  // schedule m1 again on a future day (not completed); the trigger copies the lesson text
  await db.query("INSERT INTO schedule_items (student_id, date, position, lesson_id) VALUES ($1,'2099-01-05',0,$2)", [studentId, m1]);
  let out = await exportLegacySnapshot(db, studentId);
  assert.equal(out.schedule["2099-01-05"][0].title, "Math lesson 1");

  // Edit the catalog lesson: NOTHING already assigned changes by itself.
  await db.query("UPDATE lessons SET title = 'Math lesson 1 (rewritten)' WHERE id = $1", [m1]);
  out = await exportLegacySnapshot(db, studentId);
  assert.equal(out.assignments.Math.find((l) => l.id === "m1").title, "Math lesson 1 (rewritten)", "catalog shows the new text");
  assert.equal(out.schedule["2099-01-05"][0].title, "Math lesson 1", "future assignment keeps its copy until you sync");
  assert.equal(out.schedule["2026-08-10"].find((l) => l.id === "m1").title, "Math lesson 1", "completed past item keeps the old text");

  // Opt-in sync: only future, unfinished assignments are refreshed.
  const refreshed = (await db.query("SELECT refresh_lesson_snapshots($1, '2026-01-01') AS n", [m1])).rows[0].n;
  out = await exportLegacySnapshot(db, studentId);
  assert.equal(refreshed, 1, "only the future, unfinished item is refreshed");
  assert.equal(out.schedule["2099-01-05"][0].title, "Math lesson 1 (rewritten)");
  assert.equal(out.schedule["2026-08-10"].find((l) => l.id === "m1").title, "Math lesson 1", "completed item still untouched");

  // Extra fields travel with the copy too.
  await db.query("INSERT INTO schedule_items (student_id, date, position, lesson_id) VALUES ($1,'2099-01-06',0,$2)", [studentId, r2]);
  out = await exportLegacySnapshot(db, studentId);
  assert.deepEqual(out.schedule["2099-01-06"][0].someFutureField, { nested: true });
});

test("customizing: one student's copy changes; the catalog and other students do not", async () => {
  const db = await freshDb();
  const { householdId, studentId: liora } = await importLegacySnapshot(db, syntheticSnapshot(), { householdName: "T", studentName: "Liora" });
  const amari = await createStudent(db, { householdId, name: "Amari" });
  const m1 = (await db.query("SELECT id FROM lessons WHERE household_id = $1 AND legacy_id = 'm1'", [householdId])).rows[0].id;
  for (const sid of [liora, amari]) await db.query("INSERT INTO schedule_items (student_id, date, position, lesson_id) VALUES ($1,'2099-02-01',0,$2)", [sid, m1]);

  // Amari gets a shorter, retitled version of the same lesson.
  await db.query("SELECT customize_assignment($1, '2099-02-01', 0, $2::jsonb)", [amari, JSON.stringify({ title: "Math 1 (short version)", estMin: 10 })]);
  const a = await exportLegacySnapshot(db, amari);
  const l = await exportLegacySnapshot(db, liora);
  assert.equal(a.schedule["2099-02-01"][0].title, "Math 1 (short version)");
  assert.equal(a.schedule["2099-02-01"][0].estMin, 10);
  assert.equal(a.schedule["2099-02-01"][0].id, "m1", "still linked to the original lesson");
  assert.equal(l.schedule["2099-02-01"][0].title, "Math lesson 1", "Liora's copy unchanged");
  assert.equal(a.assignments.Math.find((x) => x.id === "m1").title, "Math lesson 1", "catalog unchanged, no duplicate lesson created");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lessons WHERE household_id = $1", [householdId])).rows[0].n, 5);

  // A later catalog edit + sync keeps Amari's customized fields but updates the rest.
  await db.query("UPDATE lessons SET title = 'New catalog title', description = 'New catalog description' WHERE id = $1", [m1]);
  await db.query("SELECT refresh_lesson_snapshots($1, '2026-01-01')", [m1]);
  const a2 = (await exportLegacySnapshot(db, amari)).schedule["2099-02-01"][0];
  const l2 = (await exportLegacySnapshot(db, liora)).schedule["2099-02-01"][0];
  assert.equal(a2.title, "Math 1 (short version)", "customized title survives the sync");
  assert.equal(a2.estMin, 10, "customized estMin survives the sync");
  assert.equal(a2.description, "New catalog description", "uncustomized field follows the catalog");
  assert.equal(l2.title, "New catalog title", "Liora, never customized, follows the catalog");
  assert.deepEqual((await db.query("SELECT customized_fields FROM schedule_items WHERE student_id = $1", [amari])).rows[0].customized_fields, ["estMin", "title"]);

  await assert.rejects(db.query("SELECT customize_assignment($1, '2099-12-31', 0, '{}'::jsonb)", [amari]), /no assignment/);
});

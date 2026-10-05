// Converts between the old app's single JSON snapshot (the 15 localStorage keys / the
// backup file the Settings tab exports) and the relational tables.
//
//   importLegacySnapshot(db, snapshot, opts)  snapshot -> tables   (one-time migration)
//   exportLegacySnapshot(db, studentId)       tables -> snapshot   (parity test; also a
//                                                                   handy JSON export later)
//
// Rules applied on import, agreed with the owner:
//   * completion-log entries whose lesson no longer exists are DROPPED (reported)
//   * `false` log / skill entries mean "not done" and are stored as no row at all
//   * an `overrides` value of [] is treated as "no overrides"
//   * keys the old app never saved (null in the export) get the old app's fallback so
//     behaviour is unchanged: default life-skills catalog, default evaluation, default
//     alert settings
//   * unknown extra fields are kept in `meta`, never silently discarded

import { runSql } from "./migrate.mjs";
import { DEFAULTS, createHousehold, createStudent, ensureSubject, insertLifeSkillCatalog, pgArray } from "./households.mjs";

// What the old app fell back to when a key had never been saved (from App.jsx).
export const LEGACY_FALLBACKS = {
  evaluation: { label: "7th Grade Evaluation Assessment", status: "pending", dueDate: "2027-04-30", showFrom: "2027-03-01" },
  alertSettings: { browser: true, apollo: true },
};

const LESSON_KNOWN = new Set(["id", "subject", "title", "platform", "description", "level", "estMin", "seq", "gradingType", "gradeMax"]);
const SEMESTER_KNOWN = new Set(["id", "name", "mode", "startDate", "endDate", "subjects", "targetDays", "active"]);
const TRIP_KNOWN = new Set(["date", "place", "subjects", "notes", "countsAttendance"]);
const ACTIVITY_KNOWN = new Set(["name", "type", "days", "time", "location", "notes"]);

const rest = (obj, known) => Object.fromEntries(Object.entries(obj).filter(([k]) => !known.has(k)));
const nn = (v) => (v === undefined ? null : v);
// The frozen text of a scheduled item: everything except the columns id and date.
const frozen = (item) => { const { id, date, ...text } = item; return text; };

// ───────────────────────────── import ─────────────────────────────

export async function importLegacySnapshot(
  db,
  snap,
  { householdName, studentName, gradeLabel = null, ownerEmail = null } = {}
) {
  const report = { counts: {}, dropped: { log: [], grades: [], schedule: [], overrides: [], alerts: [] }, warnings: [], scheduleDrift: [] };

  await runSql(db, "BEGIN");
  try {
    const householdId = await createHousehold(db, { name: householdName, ownerEmail, seedLifeSkills: false });
    const studentId = await createStudent(db, { householdId, name: studentName, gradeLabel });
    const catalog = snap.assignments ?? {};

    // subjects: catalog order first, then anything only referenced by semesters / pattern
    const subjectNames = [...Object.keys(catalog)];
    for (const sem of Object.values(snap.semesters ?? {})) for (const n of sem.subjects ?? []) if (!subjectNames.includes(n)) subjectNames.push(n);
    for (const rule of snap.pattern ?? []) if (!subjectNames.includes(rule.subject)) subjectNames.push(rule.subject);
    const subjectId = new Map();
    for (const [i, name] of subjectNames.entries()) subjectId.set(name, await ensureSubject(db, householdId, name, i));

    // lessons (the shared catalog)
    const lessonByLegacy = new Map();
    const lessonRow = new Map(); // legacy id -> catalog object, for drift checks
    for (const [subject, items] of Object.entries(catalog)) {
      for (const [position, x] of items.entries()) {
        if (x.subject && x.subject !== subject) report.warnings.push(`lesson ${x.id}: subject "${x.subject}" filed under "${subject}"`);
        const { rows } = await db.query(
          `INSERT INTO lessons (household_id, legacy_id, subject_id, title, platform, description, level, est_min, seq, position, grading_type, grade_max, meta)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) RETURNING id`,
          [householdId, x.id, subjectId.get(subject), x.title, nn(x.platform), nn(x.description), nn(x.level), nn(x.estMin), nn(x.seq), position, nn(x.gradingType), nn(x.gradeMax), JSON.stringify(rest(x, LESSON_KNOWN))]
        );
        lessonByLegacy.set(x.id, rows[0].id);
        lessonRow.set(x.id, x);
      }
    }
    report.counts.lessons = lessonByLegacy.size;

    // semesters + this student's enrollments
    const activeSlug = snap.activeSemester ?? null;
    const patternRules = snap.pattern ?? [];
    for (const [key, sem] of Object.entries(snap.semesters ?? {})) {
      const slug = sem.id ?? key;
      const { rows: s } = await db.query(
        "INSERT INTO semesters (household_id, slug, name, mode, start_date, end_date, meta) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id",
        [householdId, slug, sem.name, nn(sem.mode), sem.startDate, sem.endDate, JSON.stringify(rest(sem, SEMESTER_KNOWN))]
      );
      const isActive = slug === activeSlug;
      const { rows: e } = await db.query(
        "INSERT INTO enrollments (student_id, semester_id, target_days, is_active) VALUES ($1,$2,$3,$4) RETURNING id",
        [studentId, s[0].id, nn(sem.targetDays), isActive]
      );
      for (const [i, n] of (sem.subjects ?? []).entries()) {
        await db.query("INSERT INTO enrollment_subjects (enrollment_id, subject_id, position) VALUES ($1,$2,$3)", [e[0].id, subjectId.get(n), i]);
      }
      // The old app had ONE global weekly pattern; it belongs to the active enrollment.
      if (isActive) {
        for (const [i, rule] of patternRules.entries()) {
          await db.query("INSERT INTO enrollment_pattern (enrollment_id, subject_id, days, position) VALUES ($1,$2,$3::smallint[],$4)", [e[0].id, subjectId.get(rule.subject), pgArray(rule.days), i]);
        }
      }
    }
    if (activeSlug && !Object.values(snap.semesters ?? {}).some((s) => (s.id ?? "") === activeSlug)) {
      report.warnings.push(`activeSemester "${activeSlug}" is not in semesters`);
    }

    // schedule (each item keeps the exact text it was scheduled with; any difference from the
    // current catalog text is reported as drift, but preserved, not overwritten)
    let scheduleItems = 0;
    for (const [date, items] of Object.entries(snap.schedule ?? {})) {
      let pos = 0;
      for (const item of items) {
        const lessonId = lessonByLegacy.get(item.id);
        if (!lessonId) { report.dropped.schedule.push(`${date}:${item.id}`); continue; }
        const cat = lessonRow.get(item.id);
        const changed = ["title", "platform", "description", "level", "estMin", "seq", "subject"].filter((f) => item[f] !== cat[f]);
        if (changed.length) report.scheduleDrift.push({ date, lesson: item.id, fields: changed, scheduledTitle: item.title, catalogTitle: cat.title });
        await db.query("INSERT INTO schedule_items (student_id, date, position, lesson_id, snapshot) VALUES ($1,$2,$3,$4,$5::jsonb)", [studentId, date, pos++, lessonId, JSON.stringify(frozen(item))]);
        scheduleItems++;
      }
    }
    report.counts.scheduleItems = scheduleItems;

    // overrides ([] or {} when unused)
    const overrides = snap.overrides ?? {};
    if (Array.isArray(overrides)) {
      if (overrides.length) report.warnings.push("overrides was a non-empty array; not imported");
    } else {
      for (const [date, val] of Object.entries(overrides)) {
        await db.query("INSERT INTO schedule_overrides (student_id, date, is_skip) VALUES ($1,$2,$3)", [studentId, date, val === "SKIP"]);
        if (Array.isArray(val)) {
          let pos = 0;
          for (const item of val) {
            const lessonId = lessonByLegacy.get(item.id);
            if (!lessonId) { report.dropped.overrides.push(`${date}:${item.id}`); continue; }
            await db.query("INSERT INTO schedule_override_items (student_id, date, position, lesson_id, snapshot) VALUES ($1,$2,$3,$4,$5::jsonb)", [studentId, date, pos++, lessonId, JSON.stringify(frozen(item))]);
          }
        }
      }
    }

    // completion log: true -> done, "skipped" -> skipped, false -> no row
    let completions = 0;
    for (const [date, entries] of Object.entries(snap.log ?? {})) {
      for (const [legacyId, val] of Object.entries(entries)) {
        if (!val) continue;
        const lessonId = lessonByLegacy.get(legacyId);
        if (!lessonId) { report.dropped.log.push(`${date}:${legacyId}`); continue; }
        const status = val === "skipped" ? "skipped" : "done";
        if (val !== true && val !== "skipped") report.warnings.push(`log ${date}:${legacyId} had unexpected value ${JSON.stringify(val)}; stored as done`);
        await db.query("INSERT INTO completions (student_id, date, lesson_id, status) VALUES ($1,$2,$3,$4)", [studentId, date, lessonId, status]);
        completions++;
      }
    }
    report.counts.completions = completions;

    // grades
    let grades = 0;
    for (const [date, entries] of Object.entries(snap.grades ?? {})) {
      for (const [legacyId, g] of Object.entries(entries)) {
        const lessonId = lessonByLegacy.get(legacyId);
        if (!lessonId) { report.dropped.grades.push(`${date}:${legacyId}`); continue; }
        if (g.type === "pass_fail") {
          await db.query("INSERT INTO grades (student_id, date, lesson_id, grade_type, passed) VALUES ($1,$2,$3,'pass_fail',$4)", [studentId, date, lessonId, g.value === "pass"]);
        } else {
          await db.query("INSERT INTO grades (student_id, date, lesson_id, grade_type, score, max_score) VALUES ($1,$2,$3,'score',$4,$5)", [studentId, date, lessonId, Number(g.value), nn(g.max)]);
        }
        grades++;
      }
    }
    report.counts.grades = grades;

    // life skills: catalog (never saved -> app default), then progress
    const skillCatalog = snap.skillsCatalog ?? DEFAULTS.lifeSkills;
    const skillByLegacy = await insertLifeSkillCatalog(db, householdId, skillCatalog);
    const fallbackDate = (snap.exportedAt ?? new Date().toISOString()).slice(0, 10);
    let progress = 0;
    for (const [key, val] of Object.entries(snap.skills ?? {})) {
      if (key.endsWith("_date") || val !== true) continue;
      const skillId = skillByLegacy.get(key);
      if (!skillId) { report.warnings.push(`skill ${key} is done but not in the catalog`); continue; }
      const date = snap.skills[`${key}_date`] ?? fallbackDate;
      if (!snap.skills[`${key}_date`]) report.warnings.push(`skill ${key} has no date; used ${fallbackDate}`);
      await db.query("INSERT INTO life_skill_progress (student_id, life_skill_id, done_date) VALUES ($1,$2,$3)", [studentId, skillId, date]);
      progress++;
    }
    report.counts.lifeSkillProgress = progress;

    // lists
    for (const [i, t] of (snap.fieldTrips ?? []).entries()) {
      await db.query(
        "INSERT INTO field_trips (student_id, trip_date, place, subjects, notes, counts_attendance, position, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
        [studentId, t.date, t.place, nn(t.subjects), nn(t.notes), t.countsAttendance !== false, i, JSON.stringify(rest(t, TRIP_KNOWN))]
      );
    }
    for (const [i, a] of (snap.extracurriculars ?? []).entries()) {
      await db.query(
        "INSERT INTO extracurriculars (student_id, name, type, days, time, location, notes, position, meta) VALUES ($1,$2,$3,$4::smallint[],$5,$6,$7,$8,$9::jsonb)",
        [studentId, a.name, nn(a.type), pgArray(a.days ?? []), nn(a.time), nn(a.location), nn(a.notes), i, JSON.stringify(rest(a, ACTIVITY_KNOWN))]
      );
    }

    // settings
    const ev = snap.evaluation ?? LEGACY_FALLBACKS.evaluation;
    await db.query("INSERT INTO evaluations (student_id, label, status, due_date, show_from) VALUES ($1,$2,$3,$4,$5)", [studentId, nn(ev.label), ev.status ?? "pending", nn(ev.dueDate), nn(ev.showFrom)]);
    const as = snap.alertSettings ?? LEGACY_FALLBACKS.alertSettings;
    await db.query("INSERT INTO alert_settings (student_id, browser, apollo) VALUES ($1,$2,$3)", [studentId, as.browser !== false, as.apollo !== false]);
    for (const [key, time] of Object.entries(snap.alerts ?? {})) {
      const idx = key.indexOf(":");
      const date = key.slice(0, idx), legacyId = key.slice(idx + 1);
      const lessonId = lessonByLegacy.get(legacyId);
      if (!lessonId) { report.dropped.alerts.push(key); continue; }
      await db.query("INSERT INTO alerts (student_id, date, lesson_id, time) VALUES ($1,$2,$3,$4)", [studentId, date, lessonId, time]);
    }

    await runSql(db, "COMMIT");
    return { householdId, studentId, report };
  } catch (err) {
    await runSql(db, "ROLLBACK");
    throw err;
  }
}

// ───────────────────────────── export ─────────────────────────────

// Rebuilds the old app's snapshot for one student from the tables.
export async function exportLegacySnapshot(db, studentId) {
  const student = (await db.query("SELECT household_id FROM students WHERE id = $1", [studentId])).rows[0];
  if (!student) throw new Error(`no such student ${studentId}`);
  const householdId = student.household_id;
  const key = (row) => row.legacy_id ?? row.id;

  const lessonObj = (r) => {
    const o = { id: key(r), subject: r.subject };
    const set = (k, v) => { if (v !== null && v !== undefined) o[k] = v; };
    set("title", r.title); set("platform", r.platform); set("description", r.description); set("level", r.level);
    set("estMin", r.est_min); set("seq", r.seq); set("gradingType", r.grading_type); set("gradeMax", r.grade_max);
    return { ...o, ...(r.meta ?? {}) };
  };
  const LESSON_COLS = `l.id, l.legacy_id, sub.name AS subject, l.title, l.platform, l.description, l.level, l.est_min, l.seq, l.grading_type, l.grade_max, l.meta`;

  // semesters via enrollments
  const enrollments = (await db.query(
    `SELECT e.id AS enrollment_id, e.target_days, e.is_active, s.slug, s.name, s.mode, s.start_date::text AS start_date, s.end_date::text AS end_date, s.meta
       FROM enrollments e JOIN semesters s ON s.id = e.semester_id
      WHERE e.student_id = $1 AND s.archived_at IS NULL ORDER BY s.start_date, s.slug`, [studentId])).rows;
  const semesters = {};
  let activeSemester = null;
  let pattern = [];
  for (const e of enrollments) {
    const subs = (await db.query(
      `SELECT sub.name FROM enrollment_subjects es JOIN subjects sub ON sub.id = es.subject_id WHERE es.enrollment_id = $1 ORDER BY es.position`, [e.enrollment_id])).rows.map((r) => r.name);
    const sem = { id: e.slug, name: e.name };
    if (e.mode !== null) sem.mode = e.mode;
    sem.startDate = e.start_date; sem.endDate = e.end_date; sem.subjects = subs;
    if (e.target_days !== null) sem.targetDays = e.target_days;
    sem.active = e.is_active;
    semesters[e.slug] = { ...sem, ...(e.meta ?? {}) };
    if (e.is_active) {
      activeSemester = e.slug;
      pattern = (await db.query(
        `SELECT sub.name AS subject, p.days FROM enrollment_pattern p JOIN subjects sub ON sub.id = p.subject_id WHERE p.enrollment_id = $1 ORDER BY p.position`, [e.enrollment_id])).rows.map((r) => ({ subject: r.subject, days: r.days }));
    }
  }

  // catalog (archived lessons are hidden from it)
  const assignments = {};
  for (const r of (await db.query(`SELECT name FROM subjects WHERE household_id = $1 AND archived_at IS NULL ORDER BY sort_order, name`, [householdId])).rows) assignments[r.name] = [];
  for (const r of (await db.query(
    `SELECT ${LESSON_COLS} FROM lessons l JOIN subjects sub ON sub.id = l.subject_id
      WHERE l.household_id = $1 AND l.archived_at IS NULL ORDER BY sub.sort_order, sub.name, l.position, l.created_at`, [householdId])).rows) {
    assignments[r.subject].push(lessonObj(r));
  }

  // schedule + overrides (these include archived lessons: history stays intact)
  const schedule = {};
  for (const r of (await db.query(
    `SELECT si.date::text AS date, l.id, l.legacy_id, si.snapshot FROM schedule_items si JOIN lessons l ON l.id = si.lesson_id
      WHERE si.student_id = $1 ORDER BY si.date, si.position`, [studentId])).rows) {
    (schedule[r.date] ??= []).push({ id: key(r), ...r.snapshot, date: r.date });
  }
  const overrides = {};
  for (const r of (await db.query(`SELECT date::text AS date, is_skip FROM schedule_overrides WHERE student_id = $1 ORDER BY date`, [studentId])).rows) {
    overrides[r.date] = r.is_skip ? "SKIP" : [];
  }
  for (const r of (await db.query(
    `SELECT oi.date::text AS date, l.id, l.legacy_id, oi.snapshot FROM schedule_override_items oi JOIN lessons l ON l.id = oi.lesson_id
      WHERE oi.student_id = $1 ORDER BY oi.date, oi.position`, [studentId])).rows) {
    overrides[r.date].push({ id: key(r), ...r.snapshot, date: r.date });
  }

  // log, grades, alerts
  const log = {};
  for (const r of (await db.query(
    `SELECT c.date::text AS date, l.id, l.legacy_id, c.status FROM completions c JOIN lessons l ON l.id = c.lesson_id WHERE c.student_id = $1 ORDER BY c.date`, [studentId])).rows) {
    (log[r.date] ??= {})[key(r)] = r.status === "skipped" ? "skipped" : true;
  }
  const grades = {};
  for (const r of (await db.query(
    `SELECT g.date::text AS date, l.id, l.legacy_id, g.grade_type, g.passed, g.score, g.max_score FROM grades g JOIN lessons l ON l.id = g.lesson_id WHERE g.student_id = $1 ORDER BY g.date`, [studentId])).rows) {
    (grades[r.date] ??= {})[key(r)] = r.grade_type === "pass_fail" ? { type: "pass_fail", value: r.passed ? "pass" : "fail" } : { type: "score", value: r.score, max: r.max_score };
  }
  const alerts = {};
  for (const r of (await db.query(
    `SELECT a.date::text AS date, l.id, l.legacy_id, a.time FROM alerts a JOIN lessons l ON l.id = a.lesson_id WHERE a.student_id = $1 ORDER BY a.date`, [studentId])).rows) {
    alerts[`${r.date}:${key(r)}`] = r.time;
  }

  // life skills
  const skillsCatalog = {};
  for (const r of (await db.query(`SELECT id, legacy_id, category, title FROM life_skills WHERE household_id = $1 AND archived_at IS NULL ORDER BY sort_order`, [householdId])).rows) {
    (skillsCatalog[r.category] ??= []).push({ id: key(r), title: r.title });
  }
  const skills = {};
  for (const r of (await db.query(
    `SELECT s.id, s.legacy_id, p.done_date::text AS done_date FROM life_skill_progress p JOIN life_skills s ON s.id = p.life_skill_id WHERE p.student_id = $1 ORDER BY s.sort_order`, [studentId])).rows) {
    skills[key(r)] = true;
    skills[`${key(r)}_date`] = r.done_date;
  }

  // lists + settings
  const fieldTrips = (await db.query(
    `SELECT trip_date::text AS date, place, subjects, notes, counts_attendance, meta FROM field_trips WHERE student_id = $1 ORDER BY position, created_at`, [studentId])).rows.map((r) => {
    const o = { date: r.date, place: r.place };
    if (r.subjects !== null) o.subjects = r.subjects;
    if (r.notes !== null) o.notes = r.notes;
    o.countsAttendance = r.counts_attendance;
    return { ...o, ...(r.meta ?? {}) };
  });
  const extracurriculars = (await db.query(
    `SELECT name, type, days, time, location, notes, meta FROM extracurriculars WHERE student_id = $1 ORDER BY position, created_at`, [studentId])).rows.map((r) => {
    const o = { name: r.name };
    for (const [k, v] of [["type", r.type], ["days", r.days], ["time", r.time], ["location", r.location], ["notes", r.notes]]) if (v !== null) o[k] = v;
    return { ...o, ...(r.meta ?? {}) };
  });
  const ev = (await db.query(`SELECT label, status, due_date::text AS due_date, show_from::text AS show_from FROM evaluations WHERE student_id = $1`, [studentId])).rows[0];
  const evaluation = ev ? { label: ev.label, status: ev.status, dueDate: ev.due_date, showFrom: ev.show_from } : null;
  const as = (await db.query(`SELECT browser, apollo FROM alert_settings WHERE student_id = $1`, [studentId])).rows[0];
  const alertSettings = as ? { browser: as.browser, apollo: as.apollo } : null;

  return { semesters, assignments, schedule, overrides, pattern, log, grades, skills, skillsCatalog, fieldTrips, extracurriculars, activeSemester, evaluation, alerts, alertSettings };
}

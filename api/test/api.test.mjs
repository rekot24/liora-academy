// Run:  npm test
//       LEGACY_BACKUP=/path/to/liora-academy-backup.json npm test    (also replays your real export through the API)
//
// Everything runs in memory (PGlite + Fastify's inject), so no server or network is needed.
// Real exports hold a child's records: keep them OUT of the repo and point LEGACY_BACKUP at a local file.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../../db/lib/migrate.mjs";
import { importLegacySnapshot, exportLegacySnapshot, LEGACY_FALLBACKS } from "../../db/lib/legacy.mjs";
import { DEFAULTS, createHousehold, createStudent } from "../../db/lib/households.mjs";
import { buildApp } from "../src/app.mjs";
import { pgliteAdapter } from "../src/db.mjs";

// ── helpers ──

async function freshWorld() {
  const pglite = new PGlite();
  await migrate(pglite);
  return { pglite, db: pgliteAdapter(pglite) };
}

function client(app) {
  const call = async (method, url, payload) => {
    const res = await app.inject({ method, url, payload });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
  };
  return {
    raw: (method, url, headers = {}) => app.inject({ method, url, headers }),
    get: (url) => call("GET", url),
    patch: (url, body) => call("PATCH", url, body),
    put: (url, body) => call("PUT", url, body),
    post: (url, body) => call("POST", url, body),
  };
}

const lesson = (id, subject, n, extra = {}) => ({ id, subject, title: `${subject} lesson ${n}`, platform: "Test", description: `desc ${n}`, level: "5th grade", estMin: 20 + n, seq: n, ...extra });

function fixture() {
  const assignments = {
    Math: [lesson("m1", "Math", 1), lesson("m2", "Math", 2, { gradingType: "score", gradeMax: 50 }), lesson("m3", "Math", 3, { gradingType: "pass_fail" })],
    Reading: [lesson("r1", "Reading", 1), lesson("r2", "Reading", 2, { someFutureField: { nested: true } })],
    Science: [],
  };
  const flat = Object.values(assignments).flat();
  const day = (date, ids) => ids.map((id) => ({ ...flat.find((l) => l.id === id), date }));
  return {
    exportedAt: "2026-10-02T18:59:56.553Z",
    semesters: {
      "2026-summer": { id: "2026-summer", name: "Summer", mode: "lite", startDate: "2026-05-01", endDate: "2026-07-31", subjects: ["Math"], targetDays: 60, active: false },
      "2026-fall": { id: "2026-fall", name: "Fall 2026", mode: "full", startDate: "2026-08-04", endDate: "2026-12-19", subjects: ["Math", "Reading", "Science"], targetDays: 86, active: true },
    },
    activeSemester: "2026-fall",
    assignments,
    schedule: { "2026-08-10": day("2026-08-10", ["m1", "r1"]), "2026-08-11": day("2026-08-11", ["m2"]), "2026-08-12": day("2026-08-12", ["m3", "r2"]) },
    overrides: { "2026-08-13": "SKIP", "2026-08-14": day("2026-08-14", ["r1"]) },
    pattern: [{ subject: "Math", days: [1, 3, 5] }, { subject: "Reading", days: [0, 1, 2, 3, 4, 5, 6] }, { subject: "Science", days: [2, 4] }],
    log: { "2026-08-10": { m1: true, r1: false }, "2026-08-11": { m2: "skipped" }, "2026-08-12": { m3: true, ghost: true }, "2026-08-09": { m1: false } },
    grades: { "2026-08-11": { m2: { type: "score", value: 42, max: 50 } }, "2026-08-12": { m3: { type: "pass_fail", value: "fail" }, ghost: { type: "pass_fail", value: "pass" } } },
    skills: { ls001: true, ls001_date: "2026-08-12", ls002: false, ls002_date: "2026-08-12" },
    skillsCatalog: { Kitchen: [{ id: "ls001", title: "Knife skills" }, { id: "ls002", title: "Cook a meal" }], Auto: [{ id: "ls003", title: "Check oil" }] },
    fieldTrips: [{ id: "ft1", date: "2026-09-01", place: "Museum", subjects: "History", notes: "fun", countsAttendance: true }, { id: "ft2", date: "2026-09-15", place: "Park", countsAttendance: false }],
    extracurriculars: [{ id: "ex1", name: "Swim", type: "Sport", days: [2, 4], time: "16:00", location: "Rec center", notes: "" }],
    evaluation: { label: "Annual evaluation", status: "scheduled", dueDate: "2027-04-30", showFrom: "2027-03-01" },
    alerts: { "2026-08-10:m1": "09:30", "2026-08-10:ghost": "10:00" },
    alertSettings: { browser: false, apollo: true },
  };
}

// What a snapshot should look like after going through the API: the agreed normalizations.
function expectedSnapshot(snap) {
  const s = structuredClone(snap);
  delete s.exportedAt;
  delete s.missed; // the old app's unused "missed" key is not part of the new model
  s.skillsCatalog ??= DEFAULTS.lifeSkills;
  s.evaluation ??= LEGACY_FALLBACKS.evaluation;
  s.alertSettings ??= LEGACY_FALLBACKS.alertSettings;
  s.grades ??= {}; s.alerts ??= {}; s.fieldTrips ??= []; s.extracurriculars ??= [];
  s.overrides = Array.isArray(s.overrides) ? {} : s.overrides ?? {};
  const known = new Set(Object.values(s.assignments).flat().map((l) => l.id));
  const prune = (obj) => {
    for (const [d, entries] of Object.entries(obj)) {
      const kept = Object.fromEntries(Object.entries(entries).filter(([id, v]) => v && known.has(id)));
      if (Object.keys(kept).length) obj[d] = kept; else delete obj[d];
    }
  };
  s.log ??= {};
  prune(s.log);
  prune(s.grades);
  s.alerts = Object.fromEntries(Object.entries(s.alerts).filter(([k]) => known.has(k.slice(k.indexOf(":") + 1))));
  const skills = {};
  for (const [k, v] of Object.entries(s.skills ?? {})) {
    if (!k.endsWith("_date") && v === true) { skills[k] = true; skills[`${k}_date`] = s.skills[`${k}_date`]; }
  }
  s.skills = skills;
  return s;
}

// Drives the API the way the app would, to rebuild a snapshot in an EMPTY student.
async function replay(api, studentId, snap) {
  const base = `/api/v1/students/${studentId}`;
  const ok = (r, what) => assert.equal(r.status, 200, `${what}: ${JSON.stringify(r.body)}`);
  const lessons = Object.values(snap.assignments).flat();
  ok(await api.patch("/api/v1/catalog", {
    subjects: Object.keys(snap.assignments),
    lessons: { upsert: lessons },
    order: Object.fromEntries(Object.entries(snap.assignments).map(([s, items]) => [s, items.map((l) => l.id)])),
  }), "catalog");
  const skillList = Object.entries(snap.skillsCatalog ?? DEFAULTS.lifeSkills).flatMap(([category, items]) => items.map((i) => ({ id: i.id, category, title: i.title })));
  ok(await api.patch("/api/v1/life-skills", { upsert: skillList, order: skillList.map((x) => x.id) }), "life skills");
  ok(await api.patch(`${base}/semesters`, { semesters: snap.semesters, activeSemester: snap.activeSemester }), "semesters");
  ok(await api.put(`${base}/pattern`, snap.pattern), "pattern");
  ok(await api.patch(`${base}/schedule`, snap.schedule), "schedule");
  ok(await api.patch(`${base}/overrides`, Array.isArray(snap.overrides) ? {} : snap.overrides ?? {}), "overrides");
  ok(await api.patch(`${base}/log`, snap.log ?? {}), "log");
  ok(await api.patch(`${base}/grades`, snap.grades ?? {}), "grades");
  ok(await api.patch(`${base}/skills`, snap.skills ?? {}), "skills");
  ok(await api.patch(`${base}/alerts`, snap.alerts ?? {}), "alerts");
  ok(await api.patch(`${base}/field-trips`, { upsert: snap.fieldTrips ?? [] }), "field trips");
  ok(await api.patch(`${base}/extracurriculars`, { upsert: snap.extracurriculars ?? [] }), "extracurriculars");
  ok(await api.put(`${base}/evaluation`, snap.evaluation ?? LEGACY_FALLBACKS.evaluation), "evaluation");
  ok(await api.put(`${base}/alert-settings`, snap.alertSettings ?? LEGACY_FALLBACKS.alertSettings), "alert settings");
}

async function emptyStudent(db) {
  const householdId = await createHousehold(db, { name: "Replay family", seedLifeSkills: false });
  const studentId = await createStudent(db, { householdId, name: "Liora" });
  return { householdId, studentId };
}

async function seeded() {
  const { pglite, db } = await freshWorld();
  const { householdId, studentId } = await importLegacySnapshot(pglite, fixture(), { householdName: "Test family", studentName: "Liora" });
  const app = await buildApp({ db, householdId });
  return { pglite, db, app, api: client(app), householdId, studentId, base: `/api/v1/students/${studentId}` };
}

// ── tests ──

test("health, me and snapshot", async () => {
  const { api, studentId, base } = await seeded();
  assert.deepEqual((await api.get("/api/v1/health")).body, { ok: true });
  const me = (await api.get("/api/v1/me")).body;
  assert.equal(me.household.name, "Test family");
  assert.deepEqual(me.students.map((s) => s.name), ["Liora"]);
  assert.equal(me.students[0].id, studentId);
  const snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.activeSemester, "2026-fall");
  assert.equal(Object.values(snap.assignments).flat().length, 5);
});

test("replay: the API can rebuild everything the app saves (synthetic data)", async () => {
  const { db } = await freshWorld();
  const { householdId, studentId } = await emptyStudent(db);
  const api = client(await buildApp({ db, householdId }));
  await replay(api, studentId, fixture());
  const out = (await api.get(`/api/v1/students/${studentId}/snapshot`)).body;
  delete out.exportedAt;
  assert.deepStrictEqual(out, expectedSnapshot(fixture()));
});

test("replay: your real export, rebuilt through the API (set LEGACY_BACKUP to run)", { skip: !process.env.LEGACY_BACKUP }, async () => {
  const snap = JSON.parse(await readFile(process.env.LEGACY_BACKUP, "utf8"));
  const { db } = await freshWorld();
  const { householdId, studentId } = await emptyStudent(db);
  const api = client(await buildApp({ db, householdId }));
  await replay(api, studentId, snap);
  const out = (await api.get(`/api/v1/students/${studentId}/snapshot`)).body;
  delete out.exportedAt;
  assert.deepStrictEqual(out, expectedSnapshot(snap));
});

test("a stale device cannot undo another device's work (the original sync bug)", async () => {
  const { api, base } = await seeded();
  // Device A (laptop): finishes a lesson and deletes a lesson nobody has used.
  assert.equal((await api.patch(`${base}/log`, { "2026-08-11": { m2: true } })).status, 200);
  await api.patch("/api/v1/catalog", { lessons: { upsert: [{ id: "tmp1", subject: "Math", title: "Scratch lesson" }] } });
  const removed = (await api.patch("/api/v1/catalog", { lessons: { remove: ["tmp1"] } })).body;
  assert.equal(removed.removed.tmp1, "deleted");
  // Device B (phone, still has the old copy in memory) saves something unrelated.
  const b = (await api.patch(`${base}/log`, { "2026-08-12": { r2: true }, "2026-08-20": { tmp1: true } })).body;
  assert.deepEqual(b.ignored, ["2026-08-20:tmp1"], "writes about a deleted lesson are reported, not resurrected");
  const snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.log["2026-08-11"].m2, true, "A's completion survives B's write");
  assert.equal(snap.log["2026-08-12"].r2, true, "B's completion is saved");
  assert.ok(!snap.assignments.Math.some((l) => l.id === "tmp1"), "the deleted lesson stays deleted");
});

test("log: done, skipped, undone, clear a day; unknown lessons are ignored", async () => {
  const { api, base } = await seeded();
  const r = (await api.patch(`${base}/log`, { "2026-09-01": { m1: true, m2: "skipped", nope: true } })).body;
  assert.deepEqual(r, { applied: 2, ignored: ["2026-09-01:nope"] });
  let snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.log["2026-09-01"], { m1: true, m2: "skipped" });
  await api.patch(`${base}/log`, { "2026-09-01": { m1: false } });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.log["2026-09-01"], { m2: "skipped" });
  await api.patch(`${base}/log`, { "2026-09-01": null });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.log["2026-09-01"], undefined);
});

test("grades, skills and alerts round-trip", async () => {
  const { api, base } = await seeded();
  await api.patch(`${base}/grades`, { "2026-09-02": { m2: { type: "score", value: 47, max: 50 }, m3: { type: "pass_fail", value: "pass" } } });
  await api.patch(`${base}/skills`, { ls003: true, ls003_date: "2026-09-03" });
  await api.patch(`${base}/alerts`, { "2026-09-04:r1": "08:15" });
  let snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.grades["2026-09-02"], { m2: { type: "score", value: 47, max: 50 }, m3: { type: "pass_fail", value: "pass" } });
  assert.equal(snap.skills.ls003, true);
  assert.equal(snap.skills.ls003_date, "2026-09-03");
  assert.equal(snap.alerts["2026-09-04:r1"], "08:15");
  await api.patch(`${base}/grades`, { "2026-09-02": { m2: null } });
  await api.patch(`${base}/skills`, { ls003: null, ls003_date: null });
  await api.patch(`${base}/alerts`, { "2026-09-04:r1": null });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(Object.keys(snap.grades["2026-09-02"]), ["m3"]);
  assert.equal(snap.skills.ls003, undefined);
  assert.equal(snap.alerts["2026-09-04:r1"], undefined);
});

test("schedule and overrides: replace a day, clear a day, skip a day", async () => {
  const { api, base } = await seeded();
  const items = [{ ...lesson("m1", "Math", 1), date: "2026-10-05" }, { ...lesson("r1", "Reading", 1), date: "2026-10-05" }];
  await api.patch(`${base}/schedule`, { "2026-10-05": items });
  await api.patch(`${base}/schedule`, { "2026-08-10": null });
  await api.patch(`${base}/overrides`, { "2026-10-06": "SKIP", "2026-10-07": [{ ...lesson("m3", "Math", 3), date: "2026-10-07" }], "2026-08-13": null });
  const snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.schedule["2026-10-05"].map((i) => i.id), ["m1", "r1"]);
  assert.equal(snap.schedule["2026-08-10"], undefined);
  assert.equal(snap.overrides["2026-10-06"], "SKIP");
  assert.deepEqual(snap.overrides["2026-10-07"].map((i) => i.id), ["m3"]);
  assert.equal(snap.overrides["2026-08-13"], undefined);
});

test("catalog: add, edit one field, order, delete unused, archive used, restore", async () => {
  const { api, base } = await seeded();
  // add
  await api.patch("/api/v1/catalog", { lessons: { upsert: [{ id: "n1", subject: "Science", title: "Cells", platform: "Khan", estMin: 30 }] } });
  let snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.assignments.Science.map((l) => l.id), ["n1"]);
  // edit one field: the rest is untouched
  await api.patch("/api/v1/catalog", { lessons: { upsert: [{ id: "n1", title: "Cells and tissues" }] } });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.assignments.Science[0], { id: "n1", subject: "Science", title: "Cells and tissues", platform: "Khan", estMin: 30 });
  // a lesson with no id gets one from the server
  const created = (await api.patch("/api/v1/catalog", { lessons: { upsert: [{ subject: "Science", title: "Atoms" }] } })).body.created;
  assert.equal(created.length, 1);
  // order
  await api.patch("/api/v1/catalog", { order: { Math: ["m3", "m1", "m2"] } });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.assignments.Math.map((l) => l.id), ["m3", "m1", "m2"]);
  // delete unused / archive used
  const out = (await api.patch("/api/v1/catalog", { lessons: { remove: ["n1", "m1", "ghost"] } })).body.removed;
  assert.deepEqual(out, { n1: "deleted", m1: "archived", ghost: "missing" });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.ok(!snap.assignments.Math.some((l) => l.id === "m1"), "archived lesson is hidden");
  assert.ok(snap.schedule["2026-08-10"].some((l) => l.id === "m1"), "but history keeps it");
  // adding it back restores it
  await api.patch("/api/v1/catalog", { lessons: { upsert: [{ id: "m1", subject: "Math", title: "Math lesson 1" }] } });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.ok(snap.assignments.Math.some((l) => l.id === "m1"));
});

test("semesters and pattern: switching semester carries the pattern; removal is explicit and per student", async () => {
  const { api, base, db, householdId } = await seeded();
  const current = (await api.get(`${base}/snapshot`)).body;
  // add a spring semester and make it active: the weekly pattern follows
  const spring = { id: "2027-spring", name: "Spring 2027", mode: "full", startDate: "2027-01-11", endDate: "2027-05-28", subjects: ["Math", "Reading"], targetDays: 80 };
  assert.equal((await api.patch(`${base}/semesters`, { semesters: { "2027-spring": spring }, activeSemester: "2027-spring" })).status, 200);
  let snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.activeSemester, "2027-spring");
  assert.ok(snap.semesters["2026-fall"], "sending one semester did not delete the others");
  assert.deepEqual(snap.pattern, current.pattern, "pattern carried over");
  assert.deepEqual(snap.semesters["2027-spring"].subjects, ["Math", "Reading"]);
  // omitting activeSemester leaves the active one alone
  await api.patch(`${base}/semesters`, { semesters: { "2027-spring": { ...spring, targetDays: 81 } } });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.activeSemester, "2027-spring");
  assert.equal(snap.semesters["2027-spring"].targetDays, 81);
  // change the pattern of the active semester only
  await api.put(`${base}/pattern`, [{ subject: "Math", days: [2, 4] }]);
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.pattern, [{ subject: "Math", days: [2, 4] }]);
  // a second student enrolls in the shared spring semester
  const amari = (await api.post("/api/v1/students", { name: "Amari", gradeLabel: "8th" })).body.id;
  await api.patch(`/api/v1/students/${amari}/semesters`, { semesters: { "2027-spring": { ...spring, subjects: ["Math"], targetDays: 70 } }, activeSemester: "2027-spring" });
  const a = (await api.get(`/api/v1/students/${amari}/snapshot`)).body;
  const existing = new Set(["Math", "Reading", "Science"]); // the subjects this household has
  assert.deepEqual(a.pattern, DEFAULTS.weeklyPattern.filter((r) => existing.has(r.subject)), "a new student's first semester starts with the starter pattern, for subjects that exist");
  assert.deepEqual(Object.keys(a.assignments), ["Math", "Reading", "Science"], "the starter pattern did not invent subjects");
  assert.equal(a.semesters["2027-spring"].targetDays, 70, "Amari's own target days");
  assert.equal(snap.semesters["2027-spring"].targetDays, 81, "Liora's unchanged");
  // Liora drops spring: it survives, because Amari is still enrolled; Liora's other semesters are untouched
  await api.patch(`${base}/semesters`, { remove: ["2027-spring"], activeSemester: "2026-fall" });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(Object.keys(snap.semesters), ["2026-summer", "2026-fall"]);
  assert.equal(snap.activeSemester, "2026-fall");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM semesters WHERE household_id = $1 AND slug = '2027-spring'", [householdId])).rows[0].n, 1);
  // once nobody is enrolled, the semester itself goes
  await api.patch(`/api/v1/students/${amari}/semesters`, { remove: ["2027-spring"] });
  assert.equal((await db.query("SELECT count(*)::int AS n FROM semesters WHERE household_id = $1 AND slug = '2027-spring'", [householdId])).rows[0].n, 0);
  // bad requests
  assert.equal((await api.patch(`${base}/semesters`, { activeSemester: "nope" })).status, 400);
  assert.equal((await api.patch(`${base}/semesters`, { semesters: { x: { name: "No dates" } } })).status, 400);
});

test("field trips and activities: granular, so a stale device cannot erase other devices' entries", async () => {
  const { api, base } = await seeded();
  // device A adds a trip and an activity
  await api.patch(`${base}/field-trips`, { upsert: [{ id: "ftA", date: "2026-11-01", place: "Zoo", subjects: "Science", countsAttendance: true }] });
  await api.patch(`${base}/extracurriculars`, { upsert: [{ id: "ecA", name: "Piano", days: [3], time: "17:00" }] });
  // device B (stale: has never seen those) adds its own
  await api.patch(`${base}/field-trips`, { upsert: [{ id: "ftB", date: "2026-11-02", place: "Museum", subjects: "History", countsAttendance: false }] });
  await api.patch(`${base}/extracurriculars`, { upsert: [{ id: "ecB", name: "Swim", days: [2, 4] }] });
  let snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.fieldTrips.map((t) => t.id), ["ft1", "ft2", "ftA", "ftB"]);
  assert.deepEqual(snap.extracurriculars.map((e) => e.id), ["ex1", "ecA", "ecB"]);
  // edit one trip, remove one activity, by id
  await api.patch(`${base}/field-trips`, { upsert: [{ id: "ftA", date: "2026-11-03", place: "Zoo (moved)", subjects: "Science", countsAttendance: true }] });
  await api.patch(`${base}/extracurriculars`, { remove: ["ecB", "does-not-exist"] });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.fieldTrips.find((t) => t.id === "ftA"), { id: "ftA", date: "2026-11-03", place: "Zoo (moved)", subjects: "Science", countsAttendance: true });
  assert.deepEqual(snap.extracurriculars.map((e) => e.id), ["ex1", "ecA"]);
  assert.equal((await api.patch(`${base}/field-trips`, { upsert: [{ date: "2026-11-01", place: "No id" }] })).status, 400);
});

test("evaluation and alert settings", async () => {
  const { api, base } = await seeded();
  await api.put(`${base}/evaluation`, { label: "Evaluation", status: "completed", dueDate: "2027-04-01", showFrom: "2027-03-01" });
  await api.put(`${base}/alert-settings`, { browser: true, apollo: false });
  const snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.evaluation.status, "completed");
  assert.deepEqual(snap.alertSettings, { browser: true, apollo: false });
});

test("life-skills catalog: granular; unused skills are deleted, skills with progress are archived", async () => {
  const { api, base } = await seeded();
  // add and rename without touching the others
  await api.patch("/api/v1/life-skills", { upsert: [{ id: "ls009", category: "Home", title: "New skill" }, { id: "ls001", category: "Kitchen", title: "Knife skills (renamed)" }] });
  let snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(snap.skillsCatalog.Kitchen.map((s) => s.title), ["Knife skills (renamed)", "Cook a meal"]);
  assert.deepEqual(snap.skillsCatalog.Auto, [{ id: "ls003", title: "Check oil" }], "untouched skills stay");
  assert.deepEqual(snap.skillsCatalog.Home, [{ id: "ls009", title: "New skill" }]);
  // remove: ls002 has no progress -> deleted; ls001 has progress -> archived (and the record is kept)
  const out = (await api.patch("/api/v1/life-skills", { remove: ["ls002", "ls001", "nope"] })).body;
  assert.deepEqual({ removed: out.removed, archived: out.archived }, { removed: 1, archived: 1 });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.equal(snap.skills.ls001, true, "progress on an archived skill is kept");
  assert.ok(!JSON.stringify(snap.skillsCatalog).includes("ls001"));
  // ordering
  await api.patch("/api/v1/life-skills", { order: ["ls009", "ls003"] });
  snap = (await api.get(`${base}/snapshot`)).body;
  assert.deepEqual(Object.keys(snap.skillsCatalog), ["Home", "Auto"]);
});

test("snapshot: ETag lets an unchanged answer be a tiny 304; responses are not cached otherwise", async () => {
  const { api, base } = await seeded();
  const first = await api.raw("GET", `${base}/snapshot`);
  const etag = first.headers.etag;
  assert.ok(etag && first.headers["cache-control"] === "no-cache");
  const same = await api.raw("GET", `${base}/snapshot`, { "if-none-match": etag });
  assert.equal(same.statusCode, 304);
  assert.equal(same.body, "");
  await api.patch(`${base}/log`, { "2026-09-01": { m1: true } });
  const changed = await api.raw("GET", `${base}/snapshot`, { "if-none-match": etag });
  assert.equal(changed.statusCode, 200);
  assert.notEqual(changed.headers.etag, etag);
  assert.equal((await api.raw("GET", "/api/v1/health")).headers["cache-control"], "no-store");
});

test("students: create, reject duplicates", async () => {
  const { api } = await seeded();
  const created = await api.post("/api/v1/students", { name: "Amari", gradeLabel: "8th", email: "Amari@Example.com" });
  assert.equal(created.status, 200);
  assert.equal((await api.post("/api/v1/students", { name: "Amari" })).status, 409);
  assert.equal((await api.post("/api/v1/students", {})).status, 400);
  const me = (await api.get("/api/v1/me")).body;
  assert.deepEqual(me.students.map((s) => s.name), ["Liora", "Amari"]);
});

test("another household's students are invisible", async () => {
  const { api, db, pglite } = await seeded();
  const other = await createHousehold(pglite, { name: "Someone else" });
  const stranger = await createStudent(pglite, { householdId: other, name: "Sam" });
  const base = `/api/v1/students/${stranger}`;
  assert.equal((await api.get(`${base}/snapshot`)).status, 404);
  assert.equal((await api.patch(`${base}/log`, { "2026-09-01": { m1: true } })).status, 404);
  assert.equal((await api.put(`${base}/evaluation`, { status: "pending" })).status, 404);
  assert.equal((await api.get("/api/v1/students/not-a-uuid/snapshot")).status, 404);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM completions WHERE student_id = $1", [stranger])).rows[0].n, 0);
});

test("bad input is rejected with a clear message, and nothing is half-applied", async () => {
  const { api, base } = await seeded();
  assert.equal((await api.patch(`${base}/log`, { "09/01/2026": { m1: true } })).status, 400);
  assert.equal((await api.patch(`${base}/log`, { "2026-02-31": { m1: true } })).status, 400, "impossible calendar date");
  assert.equal((await api.patch(`${base}/grades`, { "2026-09-01": { m2: { type: "score", value: "abc" } } })).status, 400);
  assert.equal((await api.put(`${base}/evaluation`, { status: "someday" })).status, 400);
  assert.equal((await api.patch(`${base}/alerts`, { "2026-09-01:r1": "9am" })).status, 400);
  assert.equal((await api.patch("/api/v1/catalog", { lessons: { upsert: [{ id: "bad", title: "No subject" }] } })).status, 400);
  // a request that fails halfway applies nothing: first entry valid, second invalid
  const before = (await api.get(`${base}/snapshot`)).body.log["2026-09-09"];
  assert.equal((await api.patch(`${base}/log`, { "2026-09-09": { m1: true }, "2026-09-10": { m1: "maybe" } })).status, 400);
  assert.equal((await api.get(`${base}/snapshot`)).body.log["2026-09-09"], before);
});

// Proves the front end's sync module (src/lib/syncClient.js) and the API agree: it replays realistic
// edits the way the app makes them, then checks the server ends up holding exactly what the
// app holds. Uses your real export when LEGACY_BACKUP is set, otherwise a small fixture.
//
//   LEGACY_BACKUP=/path/to/backup.json npm test

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../../db/lib/migrate.mjs";
import { importLegacySnapshot } from "../../db/lib/legacy.mjs";
import { buildApp } from "../src/app.mjs";
import { pgliteAdapter } from "../src/db.mjs";
import * as sync from "../../src/lib/syncClient.js";

const memoryStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

async function world() {
  const pglite = new PGlite();
  await migrate(pglite);
  const db = pgliteAdapter(pglite);
  const path = process.env.LEGACY_BACKUP;
  let snap;
  if (path) snap = JSON.parse(await readFile(path, "utf8"));
  else {
    const l = (id, subject, n) => ({ id, subject, title: `${subject} ${n}`, platform: "T", description: "d", level: "7th", estMin: 20, seq: n });
    const a = { Math: [l("m1", "Math", 1), l("m2", "Math", 2), l("m3", "Math", 3)], Reading: [l("r1", "Reading", 1), l("r2", "Reading", 2)] };
    const flat = Object.values(a).flat();
    snap = {
      semesters: { "2026-fall": { id: "2026-fall", name: "Fall", mode: "full", startDate: "2026-08-04", endDate: "2026-12-19", subjects: ["Math", "Reading"], targetDays: 80, active: true } },
      activeSemester: "2026-fall", assignments: a,
      schedule: { "2026-10-05": flat.slice(0, 2).map((x) => ({ ...x, date: "2026-10-05" })), "2026-10-06": flat.slice(2, 4).map((x) => ({ ...x, date: "2026-10-06" })) },
      overrides: {}, pattern: [{ subject: "Math", days: [1, 3, 5] }, { subject: "Reading", days: [1, 2, 3, 4, 5] }],
      log: { "2026-10-05": { m1: true } },
    };
  }
  await importLegacySnapshot(pglite, snap, { householdName: "Test", studentName: "Liora" });
  const app = await buildApp({ db });
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  return { app, address, snap };
}

const clone = (x) => structuredClone(x);
const norm = (name, v) => {
  if (name === "semesters") return Object.fromEntries(Object.entries(v ?? {}).map(([k, s]) => { const { active, ...r } = s; return [k, r]; }));
  return v;
};

test("every kind of edit the app makes ends up on the server, exactly", async (t) => {
  const { app, address } = await world();
  t.after(() => app.close());
  sync._resetForTests();
  sync.configureSync({ baseUrl: address, storage: memoryStorage() });

  const local = await sync.fetchServerState({ force: true });
  assert.ok(local, "could load the snapshot");
  const edit = (name, fn) => { const before = clone(local[name]); const after = clone(local[name]); const out = fn(after); const next = out === undefined ? after : out; sync.queueWrite(name, before, next); local[name] = next; };

  const subjects = Object.keys(local.assignments).filter((s) => local.assignments[s].length >= 3);
  const subj = subjects[0], subj2 = subjects[1] ?? subjects[0];
  const lessons = local.assignments[subj];
  const days = Object.keys(local.schedule).sort();
  const day = days[2] ?? days[days.length - 1];

  // completions
  edit("log", (l) => { l["2026-10-20"] = { [lessons[0].id]: true, [lessons[1].id]: "skipped" }; });
  const existingLogDay = Object.keys(local.log)[0];
  if (existingLogDay) edit("log", (l) => { const k = Object.keys(l[existingLogDay])[0]; delete l[existingLogDay][k]; if (!Object.keys(l[existingLogDay]).length) delete l[existingLogDay]; });
  // grades
  edit("grades", (g) => { g["2026-10-20"] = { [lessons[0].id]: { type: "pass_fail", value: "pass" }, [lessons[2].id]: { type: "score", value: 41, max: 50 } }; });
  // life skills
  const firstSkill = Object.values(local.skillsCatalog)[0][0].id;
  edit("skills", (s) => { s[firstSkill] = true; s[`${firstSkill}_date`] = "2026-10-03"; });
  // schedule: change one day (drop an item, add another)
  edit("schedule", (s) => { const items = s[day]; s[day] = [...items.slice(1), { ...lessons[2], date: day }]; });
  // overrides
  edit("overrides", (o) => { o["2026-12-01"] = "SKIP"; o["2026-12-02"] = [{ ...lessons[0], date: "2026-12-02" }]; });
  // alerts
  edit("alerts", (a) => { a[`${day}:${lessons[0].id}`] = "09:15"; });
  // lesson catalog: add, edit, remove (unused) and reorder
  edit("assignments", (c) => {
    c[subj].push({ id: "new-lesson-1", subject: subj, title: "A brand new lesson", platform: "Khan", estMin: 25 });
    c[subj][0].title = "Edited title";
    c[subj].reverse();
  });
  // life-skill catalog
  edit("skillsCatalog", (c) => { const cat = Object.keys(c)[0]; c[cat].push({ id: "ls-new-1", title: "Change a tire" }); c["Brand new category"] = [{ id: "ls-new-2", title: "Make a budget" }]; });
  // semesters: edit one, add one
  const slug = Object.keys(local.semesters)[0];
  edit("semesters", (s) => { s[slug].name = "Renamed semester"; s[slug].targetDays = 77; s["2027-spring"] = { id: "2027-spring", name: "Spring 2027", mode: "full", startDate: "2027-01-11", endDate: "2027-05-28", subjects: [...new Set([subj, subj2])], targetDays: 70 }; });
  // weekly pattern
  edit("pattern", (p) => { p[0].days = [0, 2, 4]; });
  // field trips + activities
  edit("fieldTrips", (f) => { f.push({ id: "ft-1", date: "2026-10-22", place: "Science museum", subjects: "Science", notes: "bring lunch", countsAttendance: true }); });
  edit("extracurriculars", (e) => { e.push({ id: "ex-1", name: "Swim", type: "Sport", days: [2, 4], time: "16:00", location: "Rec center", notes: "" }); });
  // settings
  edit("evaluation", (e) => ({ ...e, status: "scheduled", dueDate: "2027-04-15" }));
  edit("alertSettings", (a) => ({ ...a, browser: false }));

  await sync.flush();
  assert.equal(sync.getSyncStatus().pending, 0, "nothing left waiting");
  assert.equal(sync.getSyncStatus().error, null, `no error: ${sync.getSyncStatus().error}`);

  const server = await sync.fetchServerState({ force: true });
  for (const name of sync.WRITE_ORDER) {
    assert.equal(sync.stable(norm(name, server[name])), sync.stable(norm(name, local[name])), `${name}: server matches the app`);
  }

  // second round: remove things
  const before2 = clone(local);
  edit("fieldTrips", (f) => { f.length = 0; });
  edit("extracurriculars", (e) => { e.length = 0; });
  edit("assignments", (c) => { c[subj] = c[subj].filter((l) => l.id !== "new-lesson-1"); });
  edit("skillsCatalog", (c) => { delete c["Brand new category"]; });
  edit("semesters", (s) => { delete s["2027-spring"]; });
  edit("log", (l) => { delete l["2026-10-20"]; });
  edit("overrides", (o) => { delete o["2026-12-01"]; });
  edit("alerts", (a) => { delete a[Object.keys(a)[Object.keys(a).length - 1]]; });
  await sync.flush();
  const server2 = await sync.fetchServerState({ force: true });
  for (const name of sync.WRITE_ORDER) {
    assert.equal(sync.stable(norm(name, server2[name])), sync.stable(norm(name, local[name])), `after removals, ${name}: server matches the app`);
  }
  assert.ok(before2);
});

test("an out-of-date device only changes what it edited (the original sync bug)", async (t) => {
  const { app, address } = await world();
  t.after(() => app.close());
  sync._resetForTests();
  sync.configureSync({ baseUrl: address, storage: memoryStorage() });

  const stale = await sync.fetchServerState({ force: true }); // this device's (soon stale) copy
  const lessonIds = Object.values(stale.assignments).flat().map((l) => l.id);
  const [a, b] = lessonIds;

  // another device marks lesson `a` done
  const sid = sync.getStudentId();
  const res = await fetch(`${address}/api/v1/students/${sid}/log`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ "2026-11-02": { [a]: true } }) });
  assert.equal(res.status, 200);

  // this device, still holding the old copy, marks lesson `b` done on the same day
  const before = clone(stale.log), after = clone(stale.log);
  after["2026-11-02"] = { ...(after["2026-11-02"] ?? {}), [b]: true };
  sync.queueWrite("log", before, after);
  await sync.flush();

  const server = await sync.fetchServerState({ force: true });
  assert.equal(server.log["2026-11-02"][a], true, "the other device's work survived");
  assert.equal(server.log["2026-11-02"][b], true, "this device's edit was saved");
});

test("edits made while the server is unreachable are kept and sent later", async (t) => {
  const { app, address } = await world();
  t.after(() => app.close());
  sync._resetForTests();
  const storage = memoryStorage();
  let down = true;
  sync.configureSync({ baseUrl: address, storage, fetchImpl: async (...a) => { if (down) throw new TypeError("network down"); return fetch(...a); } });
  const snapshotWhileUp = await (async () => { down = false; const s = await sync.fetchServerState({ force: true }); down = true; return s; })();
  const id = Object.values(snapshotWhileUp.assignments).flat()[0].id;
  const before = clone(snapshotWhileUp.log), after = clone(snapshotWhileUp.log);
  after["2026-11-05"] = { [id]: true };
  sync.queueWrite("log", before, after);
  await sync.flush();
  assert.equal(sync.getSyncStatus().pending, 1, "still queued while offline");
  assert.equal(sync.getSyncStatus().online, false);
  assert.ok(storage.getItem("hs_sync_pending"), "queued edit is saved in storage so a reload can't lose it");
  down = false;
  sync.configureSync({ fetchImpl: null });
  await sync.flush();
  assert.equal(sync.getSyncStatus().pending, 0);
  const server = await sync.fetchServerState({ force: true });
  assert.equal(server.log["2026-11-05"][id], true);
});

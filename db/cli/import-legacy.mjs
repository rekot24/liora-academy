#!/usr/cli/env node
// One-time import of an exported backup JSON (Settings tab -> export) into the database.
//
//   node cli/import-legacy.mjs <backup.json> --household "Rollins family" --student Liora --grade 7th [--owner you@example.com]
//   node cli/import-legacy.mjs <backup.json> ... --dry-run      # in-memory test, touches no database
//
// Safety: refuses to run if the database already has a household (so a double run cannot
// duplicate your data) unless you pass --allow-existing. Import is a single transaction:
// if anything fails, nothing is written.

import { readFile } from "node:fs/promises";
import { importLegacySnapshot, exportLegacySnapshot } from "../lib/legacy.mjs";
import { migrate } from "../lib/migrate.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(`--${name}`);

if (!file || !opt("household") || !opt("student")) {
  console.error('usage: node cli/import-legacy.mjs <backup.json> --household "Name" --student Liora [--grade 7th] [--owner email] [--dry-run] [--allow-existing]');
  process.exit(2);
}

const snapshot = JSON.parse(await readFile(file, "utf8"));
let db;
if (flag("dry-run")) {
  const { PGlite } = await import("@electric-sql/pglite"); // dev dependency: npm install
  db = new PGlite();
  await migrate(db);
} else {
  const { connect } = await import("../lib/connect.mjs");
  db = await connect();
  const pending = await db.query("SELECT to_regclass('public.households') AS t");
  if (!pending.rows[0].t) { console.error("Tables not found. Run: node cli/migrate.mjs"); process.exit(1); }
  const existing = (await db.query("SELECT count(*)::int AS n FROM households")).rows[0].n;
  if (existing > 0 && !flag("allow-existing")) {
    console.error(`Database already has ${existing} household(s). Refusing to import again (use --allow-existing only if you really mean it).`);
    process.exit(1);
  }
}

try {
  const { householdId, studentId, report } = await importLegacySnapshot(db, snapshot, {
    householdName: opt("household"), studentName: opt("student"), gradeLabel: opt("grade") ?? null, ownerEmail: opt("owner") ?? null,
  });
  console.log(flag("dry-run") ? "DRY RUN (nothing was written to your database)" : "IMPORTED");
  console.log("  counts:", JSON.stringify(report.counts));
  console.log("  dropped:", JSON.stringify(report.dropped));
  if (report.warnings.length) console.log("  warnings:", report.warnings);
  console.log(`  schedule items whose saved text differs from the catalog (kept as scheduled): ${report.scheduleDrift.length}`);

  // verify: rebuild the snapshot from the tables and make sure the key numbers match
  const back = await exportLegacySnapshot(db, studentId);
  const lessons = Object.values(back.assignments).flat().length;
  const sched = Object.values(back.schedule).flat().length;
  const done = Object.values(back.log).flatMap((d) => Object.values(d)).length;
  console.log(`  verify from tables: ${lessons} lessons, ${sched} scheduled items, ${done} completions`);
  console.log(`  household ${householdId}\n  student   ${studentId}`);
} finally {
  if (db.end) await db.end();
}

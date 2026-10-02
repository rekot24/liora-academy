#!/usr/bin/env node
// Writes one student's data in the old backup-JSON shape: a safety net / rollback copy.
//   node bin/export-legacy.mjs --student Liora > liora-snapshot.json
// (Do not commit the output: it holds a child's school records.)

import { connect } from "../lib/connect.mjs";
import { exportLegacySnapshot } from "../lib/legacy.mjs";

const i = process.argv.indexOf("--student");
const name = i >= 0 ? process.argv[i + 1] : null;
if (!name) { console.error("usage: node bin/export-legacy.mjs --student Liora"); process.exit(2); }

const db = await connect();
try {
  const { rows } = await db.query("SELECT id FROM students WHERE name = $1", [name]);
  if (rows.length !== 1) { console.error(rows.length ? `More than one student named ${name}` : `No student named ${name}`); process.exit(1); }
  const snap = await exportLegacySnapshot(db, rows[0].id);
  process.stdout.write(JSON.stringify({ exportedAt: new Date().toISOString(), ...snap }, null, 2) + "\n");
} finally {
  await db.end();
}

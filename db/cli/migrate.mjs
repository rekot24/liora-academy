#!/usr/cli/env node
// Applies any unapplied migrations in db/migrations/ to the database in DATABASE_URL.
// Safe to run repeatedly: applied migrations are recorded in schema_migrations and skipped.
//   node cli/migrate.mjs

import { connect } from "../lib/connect.mjs";
import { migrate } from "../lib/migrate.mjs";

const db = await connect();
try {
  const ran = await migrate(db, { log: (m) => console.log(m) });
  console.log(ran.length ? `applied ${ran.length} migration(s): ${ran.join(", ")}` : "already up to date");
  const { rows } = await db.query("SELECT version, applied_at FROM schema_migrations ORDER BY version");
  for (const r of rows) console.log(`  ${r.version}  (${r.applied_at.toISOString()})`);
} finally {
  await db.end();
}

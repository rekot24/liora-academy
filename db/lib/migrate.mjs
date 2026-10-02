// Applies numbered SQL files from db/migrations/ exactly once each, in order.
//
// `db` is anything with `query(sql, params?)` returning `{ rows }`. That fits both
// PGlite (used by the tests) and a single `pg` Client (used on the server). Use a single
// connection (a Client, not a Pool) so BEGIN/COMMIT apply to the same session.
//
// Migration files are immutable once applied: add a new numbered file for every change.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

// Runs a multi-statement SQL string. PGlite exposes exec(); pg runs multiple statements
// through query() when no parameters are given.
export function runSql(db, sql) {
  return typeof db.exec === "function" ? db.exec(sql) : db.query(sql);
}

export async function migrate(db, { dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  await runSql(
    db,
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`
  );
  const applied = new Set((await db.query("SELECT version FROM schema_migrations")).rows.map((r) => r.version));
  const files = (await readdir(dir)).filter((f) => /^\d+.*\.sql$/.test(f)).sort();

  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    log(`applying ${file}`);
    await runSql(db, "BEGIN");
    try {
      await runSql(db, sql);
      await db.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await runSql(db, "COMMIT");
      ran.push(file);
    } catch (err) {
      await runSql(db, "ROLLBACK");
      throw new Error(`migration ${file} failed: ${err.message}`);
    }
  }
  return ran;
}

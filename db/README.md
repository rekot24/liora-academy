# db/ — Liora's Academy data layer

Postgres schema, migrations and migration tooling. This folder is its own npm package so the
Vite web build (`npm ci && npm run build` in the repo root) is not affected by anything here.

## Layout

| Path | What |
|---|---|
| `migrations/NNN_*.sql` | Numbered, immutable schema files. Add a new file for every change; never edit one that has been applied. |
| `seed/defaults.json` | Defaults for a NEW household: starter life-skills catalog and default weekly pattern. **No lessons are seeded.** |
| `lib/migrate.mjs` | Applies unapplied migrations in order, each in a transaction, recorded in `schema_migrations`. |
| `lib/connect.mjs` | Connects with `pg` using `DATABASE_URL` (env var or `db/.env`, which is gitignored). |
| `bin/migrate.mjs` | `npm run migrate`: applies pending migrations to your real database. Safe to re-run. |
| `bin/import-legacy.mjs` | `npm run import:legacy -- backup.json ...`: one-time import of an exported backup. Has `--dry-run`. |
| `bin/export-legacy.mjs` | `npm run export:legacy -- --student Liora`: writes the old backup-JSON shape from the tables (rollback copy). |
| `lib/households.mjs` | Create households, students, subjects, enrollments. |
| `lib/legacy.mjs` | `importLegacySnapshot` (old backup JSON → tables) and `exportLegacySnapshot` (tables → old JSON shape). |
| `test/parity.test.mjs` | Tests, run against real Postgres semantics (PGlite, in-process). |

## Run the tests

```bash
cd db
npm install
npm test
# also verify a real export (keep real exports OUT of git: this repo is public):
LEGACY_BACKUP=/path/to/liora-academy-backup.json npm test
```

## Model in one paragraph

A **household** owns **students**, **semesters**, **subjects**, **lessons** and a **life-skills
catalog**. Lessons and life skills are shared by all students in the household. A student joins a
semester through an **enrollment**, which carries that student's subject list, target days and
weekly pattern. Everything a student does (schedule, completions, grades, skill progress, field
trips, activities, evaluation, alerts) is keyed by `student_id`. `household_members` maps a verified
email to a household and role, so per-person logins (or other families) need no schema change.

## Rules the database enforces

* **Removing a lesson.** `remove_or_archive_lesson(id)` deletes a lesson nobody has ever used
  (not scheduled, not completed, not graded) and archives one that has been used. The history tables
  reference lessons with `ON DELETE RESTRICT`, so the database itself decides. `remove_import_batch(id)`
  does the same for every lesson that arrived in one import.
* **Catalog lessons are templates; assignments are the student's own copies.** Scheduling a
  lesson copies its text onto the assignment (`schedule_items.snapshot`) and keeps the link to the
  original (`lesson_id`). `customize_assignment(student, date, position, patch)` edits ONE student's
  copy without touching the catalog or anyone else, so a modified version never becomes a duplicate
  catalog lesson. Editing the catalog never changes existing assignments by itself;
  `refresh_lesson_snapshots(lesson_id, from_date)` is the opt-in sync, and it only updates future,
  unfinished assignments, keeping any fields customized for that assignment. Past and completed
  work always keeps what was actually assigned.
* **One active semester per student** (partial unique index).

## Legacy import rules

* The completion log keeps `true` (done) and `"skipped"`; `false` means not done and is stored as no row.
* Log/grade/alert entries pointing at lessons that no longer exist are dropped and listed in the report.
* `overrides: []` is treated as "no overrides".
* Keys the old app never saved get the old app's fallback (default life-skills catalog, default
  evaluation, default alert settings), so behaviour is unchanged.
* Unknown extra fields are preserved in `meta`, never silently discarded.
* The old app had one global weekly pattern; it is attached to the active enrollment.

## Putting it on your server's Postgres

PostgreSQL 13 or newer (`gen_random_uuid()` is built in). Use a separate database so nothing else on
the server is affected.

1. **Create the database and an app login, once.** As the postgres superuser (however you reach psql):
   ```sql
   CREATE ROLE liora_app LOGIN PASSWORD 'a-long-random-password';
   CREATE DATABASE liora_academy OWNER liora_app;
   ```
2. **Tell the tools where it is.** On the machine that will run the commands, create `db/.env`
   (gitignored, never committed):
   ```
   DATABASE_URL=postgres://liora_app:a-long-random-password@localhost:5432/liora_academy
   ```
3. **Create the tables.**
   ```bash
   cd db && npm install && npm run migrate
   ```
   Re-running is safe; it only applies migrations it has not applied yet.
4. **Import at cutover, not before.** Until the new API and front end are live, the app still saves in
   each browser, so an early import goes stale. Do a dry run any time (touches no database):
   ```bash
   npm run import:legacy -- /path/to/backup.json --household "Your family" --student Liora --grade 7th --dry-run
   ```
   For the real import drop `--dry-run` and add `--owner you@example.com`. It refuses to run twice.

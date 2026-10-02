# db/ — Liora's Academy data layer

Postgres schema, migrations and migration tooling. This folder is its own npm package so the
Vite web build (`npm ci && npm run build` in the repo root) is not affected by anything here.

## Layout

| Path | What |
|---|---|
| `migrations/NNN_*.sql` | Numbered, immutable schema files. Add a new file for every change; never edit one that has been applied. |
| `seed/defaults.json` | Defaults for a NEW household: starter life-skills catalog and default weekly pattern. **No lessons are seeded.** |
| `lib/migrate.mjs` | Applies unapplied migrations in order, each in a transaction, recorded in `schema_migrations`. |
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

# Data layer rebuild — October 2026: decisions

(Supersedes the Hostinger / PHP shared-sync notes in `liora-homeschool-plan.md`. A short pointer to this file is added to the plan when the data layer is deployed.)

**Infrastructure (done Oct 2, 2026).** The portal is served from the home server (Nginx, deployed by the Gitea runner from GitHub). `school.theflairhub.com` is routed through a Cloudflare Tunnel (`cloudflared`, no open router ports) and gated by Cloudflare Access (email allow-list, one-time PIN). The old Hostinger copy and `server/api.php` are retired; the PHP sync endpoint no longer exists on the server.

**Why a rebuild.** The old sync pushed one JSON blob containing all 15 localStorage keys on every save, last write wins. A device with a stale copy overwrote newer edits, and `load(key, INITIAL_ASSIGNMENTS)` re-created deleted starter lessons on any device with empty storage. Both are fixed by moving to row-level data in Postgres and removing the hardcoded starter data from the source.

**Goals.** Expandable (more students, more semesters, possibly other families), no lessons hardcoded in the app, and a history that cannot be rewritten by later edits.

**Decisions.**
- Postgres on the home server; a small Node API behind Nginx at `/api/v1`. Self-hosted Supabase was rejected (RAM cost, second Postgres, features not needed). Identity comes from the verified email Cloudflare Access supplies, mapped through `household_members`.
- Multi-tenant from day one: everything hangs off a `household`. One household today (the family); other families are a data change, not a rebuild.
- Catalogs are household-level and shared by that household's students: lessons, subjects, semesters, life skills. Everything a student does is per student: schedule, completions, grades, skill progress, field trips, activities, evaluation, alerts.
- Semesters are rows, not code. A student joins a semester via an enrollment, which carries their subject list, target days and weekly pattern. Adding Spring 2027 or a new student is an insert.
- Lessons: a lesson nobody has used can be deleted outright; a lesson that was scheduled, completed or graded is archived instead (`remove_or_archive_lesson`). Imports are grouped in batches so a whole imported sheet can be removed (`remove_import_batch`). Grade-level tags are a table (`lesson_tags`) ready for sorting and filtering later.
- Catalog lessons are templates; assignments are the student's own copies. Scheduling copies the lesson text onto the assignment and keeps a link to the original. Editing an assignment for one student (`customize_assignment`) never touches the catalog or other students, so variations do not pile up as duplicate catalog lessons. Editing the catalog changes nothing already assigned; syncing is opt-in (`refresh_lesson_snapshots`) and only touches future, unfinished, uncustomized fields. (The migration found 7 completed Constitution items whose scheduled text differs from the since-edited catalog lessons; their original text is preserved.)
- No lessons are seeded for new households. The starter life-skills catalog and default weekly pattern live in `db/seed/defaults.json`, not in `App.jsx`. The evaluation default ("7th Grade Evaluation Assessment") is Liora-specific data, not a template.
- Migrations are numbered SQL files applied once each (`db/migrations`). A nightly `pg_dump` is part of the rollout; the in-app JSON export stays as a second copy.

**Order of work.** (1) Schema + migration + parity test (this branch, `db/`). (2) Read-only API + front-end data layer swapped in behind the same state shapes, old sync code retired. (3) Student selector in the admin panel and Amari's profile (January 2027). (4) Grade tags and sorting in the Curriculum tab. Later: per-person logins, portfolio uploads, push alerts, splitting `App.jsx`.

**Known data facts at migration time.** Math and Speaking have no lessons yet (expected). Grades, field trips, extracurriculars, alerts and overrides have never been used. 140 lessons, 134 scheduled items, 17 completions for Liora.

## API (October 2026)

A small Node/Fastify service in `api/` (own Docker container, host networking, listening on
`127.0.0.1:3100`, reached through Nginx at `/api/`). Granular, transactional writes (merge-patch bodies; lists such as field trips, activities, life skills and semesters are upsert/remove by id, never whole-list replace, so a stale device cannot erase other devices' entries);
the front end keeps its existing state shapes and sends only the differences between the old and new
value of each key. Writes about deleted lessons are skipped and reported, never resurrected.
`GET /students/:id/snapshot` returns one student's data in the old app's shape. Identity is decided in
one function (`api/src/auth.mjs`). Migrations apply automatically at container start (`AUTO_MIGRATE`).
Migration 002 makes lesson archive-vs-delete work on PostgreSQL 17 and 18, which raise different error codes.

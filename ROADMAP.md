# ROADMAP

The path for Liora's Academy. **SPEC.md** is the specifics of the current milestone, **CLAUDE.md** is how to work and where things are.
Plan changes happen in chat first, then land here. Last updated: 2026-10-20.

**Goal:** an interactive, AI-assisted classical education plus everyday skills a traditional school skips, for Liora (grade 7) and Amari (grade 8, joins in January 2027). Colorado requirements are the floor, not the goal.

**The January minimum (the forcing function).** If everything else slips, January still works with M1 + M2 and the curriculum track below, running on the current portal. The rebuild track (R0 to R5) is built in parallel and never blocks the start; nothing is switched over until its feature checklist is fully ticked.

**Vision (2026-10-18).** A full-featured learning portal that handles all aspects of homeschool learning, not just scheduling. Under each lesson sits an *instruction* (working name): a series of single screens clicked through like slides, with explanations, images, diagrams and video embeds, short questions between chunks, and a quiz at the end. Quiz scores are automated and tracked, reading assignments use a countdown timer, and the student dashboard replaces today's done/not-done buttons. The interface is rebuilt as a professional, modular app (see the Rebuild track).

---

## Status right now

- Public access is live: Cloudflare Tunnel plus Cloudflare Access (email code). At home there is no login (accepted).
- Postgres database `homeschool` is live with schema migrations 001 and 002. The API container (`homeschool-api`) is deployed behind Nginx at `/api/`. Real export imported: household "Wallace family", student Liora.
- The API-backed portal is on `main` and live (M1, 2026-10-05). It syncs only through the API; the old PHP sync is gone. `main` contains everything the server runs (`db/`, `api/`, the front end).
- Nightly database backup runs from cron (`db/backup.sh`, 02:15).

## Done

- [x] 2026-10-02 Cloudflare Tunnel + Access in front of school.theflairhub.com; router port forwards removed
- [x] 2026-10-02 Schema design and migration 001 on the homeserver
- [x] 2026-10-03 API deployed, migration 002, real data imported
- [x] 2026-10-03 Front end switched to change-only API sync
- [x] 2026-10-05 M1 Cutover: API-backed portal merged to `main` and live; old PHP sync retired

## Now

C1 (session playbook and the first draft of the instruction format) is in progress in chat; research notes are in `docs/research/learning-science.md`. On the code side M2 is next; its SPEC is written in chat first.

## Next (in order)

### M2: Second student (target: Sun Nov 8) *January-critical*
Student dropdown in the admin panel; Amari's profile; a Spring 2027 semester and her enrollment. One shared lesson catalog, everything else per student. Field trips tracked per student.
Done when: every admin tab shows the selected student's data only, and adding Amari changes nothing on Liora's side.

### M3: Grade tags and catalog sorting (target: Sun Nov 22)
*Proposed: moves into the rebuild (R1), because the Curriculum screen is rebuilt there. Do it on the current portal only if January needs it.*
Use the `lesson_tags` table: tag lessons by grade level, sort and filter the Curriculum tab. Import the ready Khan CSVs (Constitution 101, 7th grade math) if still wanted.
Done when: the catalog can be filtered to "7th" or "8th" and an imported sheet can be removed as one batch.

### Rebuild track (parallel; replaces M4 and M5)
Built on its own branch while the current portal keeps running. Nothing is switched over until R0's checklist is fully ticked. Dates are rough estimates; each step gets firm dates when its SPEC is written, and each needs the one before it. January teaching starts on the current portal, not on R2.

**Decisions so far (2026-10-18)**
- Stack: Vite + TypeScript, not Next.js. The portal is a private app behind Cloudflare Access, so server rendering gains nothing, and Next.js would need a Node server on the homelab. Structure follows the befish.cc rebuild: one folder per component, hooks for logic, `lib/` for constants and pure logic, CSS Modules with design tokens, shared Drawer, Modal, Toast and ErrorBoundary.
- Build in parallel, then switch (not a rewrite in place): January must keep working, and a checklist guards against the feature-loss pattern.
- An instruction is an ordered list of screens: explain, image or diagram, video embed, quick check, reflection, final quiz. Limited scrolling: one screen per chunk where it fits; split a screen rather than scroll when practical. Videos are embeds (YouTube and similar). Images are stored on the server, not in the public repo.
- One shared lesson format, three ways to fill it: AI-drafted then reviewed, hand-written files, and an in-app editor. The format comes first and the editor last.
- The instruction is copied onto the student's assignment when scheduled, like the lesson text today, so editing one student's copy never changes the catalog or another student.
- Quizzes: multiple choice, scored automatically, the answer revealed after submitting (Khan Academy style). Retakes are allowed. Every attempt is kept with its date and per-question answers; the best attempt is the current score. Show right and wrong counts, a score (for example "8 of 10, 80%") and a plain mastery level. Confirm with CHEC whether letter grades are needed for records.
- Done and mastered are separate. Done means the work was completed (last screen reached, or reading countdown finished) and is never taken away. Mastery comes from the best quiz attempt against a threshold set in settings: not attempted, not yet, mastered. A "not yet" prompts a retake and feeds spaced review.
- Reading assignments use a fixed countdown (default from the lesson's estimated minutes, editable per assignment) with a buzzer and an on-screen alert, not an open timer. The timer stores its end time so it stays accurate if the tab sleeps. Finishing the countdown marks the reading done.
- Resume: leaving mid-instruction returns the student to the same screen.
- A real settings store (household timezone, per-student options, mastery threshold, feature flags) replaces hardcoded values. Instruction screens ship behind a feature flag.
- GUI: role-based dashboards (student and parent) with secondary controls in a slide-in drawer, replacing the layered buttons in today's admin panel. Layouts are designed in R1; the reference is the befish.cc Fish Tracker and Fish Dex pages.

**R0: Feature checklist (target: Sun Nov 15)**
List every feature of the current UI, screen by screen, and decide where the new app lives in the repo.
Done when: the checklist is committed and Joshua agrees it is complete.

**R1: Shell, tokens and dashboards (target: Sun Dec 13)**
Vite + TypeScript app, design tokens, shared components, settings store, student and parent dashboards, and catalog and schedule screens that read the real data through the existing API. Includes grade tags and catalog filters (the old M3).
Done when: the new app shows Liora's and Amari's real data next to the old portal.

**R2: Instruction player and quizzes (target: Sun Jan 17)**
Start with the storage design in `docs/design/lesson-structure.md` (draft v1: courses, instruction content copied onto assignments, progress, attempts and responses as history, a stable assignment id, re-teach as a new assignment). Then migration 003, API endpoints, the player, and automatic quiz scoring tied to the existing grades.
Done when: one real instruction runs end to end for both students and its score shows on the dashboard.

**R3: Reading countdown timer (target: Sun Jan 31)**
Countdown, buzzer, time log, reading marked done automatically.
Done when: a reading assignment completes itself when the countdown ends.

**R4: Authoring (target: Sun Feb 14 for import; the editor after)**
Import format first (AI-drafted and hand-written files), then the in-app editor.
Done when: a drafted instruction imports and plays without editing the database by hand.

**R5: Cutover (target: Mar 2027)**
Switch only when R0's checklist is fully ticked. Rollback written down first; run `bash db/backup.sh` first.
Done when: the old front end is retired and every checklist item is ticked.

## Curriculum track (not code; runs in chat in parallel)

These matter more to the goal than any milestone above. They need dates because nothing else forces them.

- [ ] C1 Session playbook: the lecture-then-AI-questions format, class blocks of 15 to 35 minutes, Wed to Fri, how the AI is used with the girls (target: Oct 31). Also produces the first draft of the instruction format (screen types, quiz rules) that R2 builds. Research: `docs/research/learning-science.md`. Progress 2026-10-20: session model v0 (five blocks, about 30 minutes, plus or minus 15) and a clickable mockup (`docs/mockups/instruction-mockup.html`) are drafted and reviewed once. Still to do: write the playbook itself and try it on one real lesson.
- [ ] C2 One shared grade 6 to 8 arc: subject list and a Colorado requirements checklist, confirmed with CHEC (target: Nov 15)
- [ ] C3 Spring 2027: the first four weeks of lessons only, not the whole semester (target: Dec 15)
- [ ] C4 Field-trip and real-world experience list, weighted over classroom time (target: Dec 15)
- [ ] C5 Amari's enrollment paperwork and any notice of intent, with timing confirmed with CHEC (target: early Dec; confirm the deadline now)
- [ ] C6 Decide the math pacing question (slow to 1x/week, extend to Unit 6, or finish early at 3x/week)

## Later (ideas with a rough order, not committed)

- Photo and portfolio uploads on lesson pages
- Scheduling backlog from the old admin redesign: Holidays and Days Off tab and `isHoliday()` helper, unified Day Editor with per-item alert times, field-trip and holiday calendar markers, Schedule Health strip, subject coverage stats, quick Assign-to-a-day, Clear Scheduled button
- How AI lives in the portal: either Joshua keeps running sessions in Claude and the lesson page holds the prepared lecture and question prompts, or a chat panel inside the portal. Decide after one semester of real sessions.
- Per-person logins (the caller lookup is isolated in `api/src/auth.mjs`)
- Spaced review: missed quiz questions resurface in later sessions (uses the attempt history from R2)

## Not now

- Rebuild the portal in Next.js (decided 2026-10-18: the rebuild uses Vite + TypeScript)
- Supabase or any hosted database (self-hosted Postgres was chosen on purpose)
- Selling or multi-household onboarding (the data model already allows it; no UI)
- Push notifications beyond the current alert settings
- befish.cc rebuild (separate project)

## Issues to be addressed

Found in the 2026-10-04 review. Move into a milestone when they block something.

- [ ] Delete the unused GitHub Actions secrets: FTP_HOST, FTP_USERNAME, FTP_PASSWORD, SSH_PRIVATE_KEY, VITE_API_KEY (no longer used by the workflow since M1). Two minutes, no code.
- [ ] `liora-homeschool-plan.md` is in a public repo and contains personal details about Liora. Scrub it or move it out of the repo.
- [ ] Old hashed asset files accumulate in `/var/www/liora-academy/assets` because the deploy now copies with `cp -r dist/.` and never deletes. They are tiny; tidy by hand occasionally.
- [ ] `AUTO_MIGRATE=true` applies new migrations the moment the API container restarts, ahead of any backup. Consider `false` plus a manual `npm run migrate` after `db/backup.sh`.
- [ ] Root clutter: the untouched Vite template README
- [x] 2026-10-18 The laptop clone at D:\coding\liora-academy is synced to `main`. Old draft copies of ROADMAP, SPEC and CLAUDE are in D:\coding\liora-academy-backup and can be deleted.
- [ ] **"Today" is computed in UTC, not local time.** `today()` in `src/App.jsx` (and several other `toISOString().split("T")[0]` date keys) use the UTC date, so after about 6 PM Mountain (5 PM in winter) the portal shows tomorrow's lessons. The server timezone does not affect this; it runs in the browser. Fix: one shared local-date helper used everywhere. Small single-file change; do it right after M1, on its own branch. The rebuild's household timezone setting is the long-term fix, but January teaching runs on the current portal, so the small fix is still worth doing.
- [ ] **Teacher-only data is not secret.** Teacher notes and quiz answer keys will travel in the lesson content and are hidden only by role, so a student could read them in browser dev tools. Fine for one family. Before any other household uses the portal: per-person logins, then the server must never send teacher fields or answer keys to student sessions. Details: `docs/design/lesson-structure.md`, section 9.
- [ ] Login screen shows the default PIN hint (`App.jsx`, "Default PIN: 9999"). Low risk (soft lock), will be gone with the rebuild (R1).
- [ ] After a deploy, a browser can keep serving the cached old front end until a hard refresh (found during M1 verification). Likely fix: a short no-cache header for `index.html` in Nginx (hashed assets can stay cached). Do not change Nginx without its own SPEC.
- [ ] Monthly review of project instructions and dev-standards (next: Nov 4)

## Log

Newest first. One line per finished milestone: date, what shipped, decisions worth keeping.

- 2026-10-20 Planning, no milestone shipped. Lesson storage design drafted (`docs/design/lesson-structure.md`). Decisions: rescheduling only changes a date; courses can be assigned whole or lesson by lesson; re-teaching is a new assignment with fresh work and optional carry-over of notes; teacher-only data hidden by role only until per-person logins (recorded as an issue).
- 2026-10-18 Planning, no milestone shipped. Scope set: a full learning portal with an instruction layer (screens, quizzes, mastery, reading countdown), rebuilt in Vite + TypeScript in parallel with the current portal. The Rebuild track (R0 to R5) replaces M4 and M5; the decisions are listed under it. Research notes started in `docs/research/learning-science.md`.
- 2026-10-05 M1 Cutover shipped: the portal reads and writes through the API, the deletion bug no longer reproduces (all six live checks passed), and `main` holds `db/`, `api/` and the new front end. Decisions: merged with a merge commit so `git revert -m 1 <merge>` undoes the cutover in one step; the deploy copies with `cp -r dist/.` instead of `rm -rf` then copy, so the site is never empty; rollback is git revert, push, redeploy (release folders and symlinks decided against on 2026-10-04); db and api tests use in-memory PGlite and never touch the live database. Also removed `db/bin/`, `claude-code-prompt.md` and `VITE_API_KEY` from the build.
- 2026-10-04 ROADMAP.md created; M1 specified.

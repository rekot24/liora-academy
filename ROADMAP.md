# ROADMAP

The path for Liora's Academy. **SPEC.md** is the specifics of the current milestone, **CLAUDE.md** is how to work and where things are.
Plan changes happen in chat first, then land here. Last updated: 2026-10-04.

**Goal:** an interactive, AI-assisted classical education plus everyday skills a traditional school skips, for Liora (grade 7) and Amari (grade 8, joins in January 2027). Colorado requirements are the floor, not the goal.

**The January minimum (the forcing function).** If everything else slips, January still works with M1 + M2 and the curriculum track below. M3 to M5 make it better; none of them blocks the start.

---

## Status right now

- Public access is live: Cloudflare Tunnel plus Cloudflare Access (email code). At home there is no login (accepted).
- Postgres database `homeschool` is live with schema migrations 001 and 002. The API container (`homeschool-api`) is deployed behind Nginx at `/api/`. Real export imported: household "Wallace family", student Liora.
- The portal front end that talks to the API is built on branch `feat/frontend-api-sync` (4 commits, tested). It has **no pull request yet and is not on `main`**, so the live portal is still on the old sync. `main` does not contain `db/` or `api/` yet.

## Done

- [x] 2026-10-02 Cloudflare Tunnel + Access in front of school.theflairhub.com; router port forwards removed
- [x] 2026-10-02 Schema design and migration 001 on the homeserver
- [x] 2026-10-03 API deployed, migration 002, real data imported
- [x] 2026-10-03 Front end switched to change-only API sync (on branch, not merged)

## Now

### M1: Cutover (target: Sun Oct 11)
Get the API-backed portal onto `main` and live, and retire the old sync. Details in SPEC.md.
Done when: the live portal reads and writes through the API, the deletion bug cannot be reproduced, a nightly backup exists, and `main` contains everything the server runs.

## Next (in order)

### M2: Second student (target: Sun Nov 8) *January-critical*
Student dropdown in the admin panel; Amari's profile; a Spring 2027 semester and her enrollment. One shared lesson catalog, everything else per student. Field trips tracked per student.
Done when: every admin tab shows the selected student's data only, and adding Amari changes nothing on Liora's side.

### M3: Grade tags and catalog sorting (target: Sun Nov 22)
Use the `lesson_tags` table: tag lessons by grade level, sort and filter the Curriculum tab. Import the ready Khan CSVs (Constitution 101, 7th grade math) if still wanted.
Done when: the catalog can be filtered to "7th" or "8th" and an imported sheet can be removed as one batch.

### M4: Split App.jsx, no behavior change (target: Sun Dec 6)
`src/App.jsx` is one 3,388-line file. Split into modules (components, hooks, lib) per dev-standards Layer 4, add an error boundary and the logger. Written *after* M2 so the student selector is not built twice, and *before* lesson pages so they are not added to the monolith.
Guard against the feature-loss pattern: write a feature checklist from the current UI first, and tick it off against the split build.
Done when: every item on the checklist works the same as before and `App.jsx` is a thin shell.

### M5: Lesson pages v1 (target: Sun Dec 20)
Each assigned lesson gets its own page: links to Khan Academy or other resources, the prepared lecture text, and notes. Clear daily steps and pacing for kids who need structure.
Done when: Wednesday's lesson for each student opens as a page and a note saved on one device shows on another.
Not in v1: photo upload (see Later).

## Curriculum track (not code; runs in chat in parallel)

These matter more to the goal than any milestone above. They need dates because nothing else forces them.

- [ ] C1 Session playbook: the lecture-then-AI-questions format, class blocks of 15 to 35 minutes, Wed to Fri, how the AI is used with the girls (target: Oct 31)
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
- Replace inline styles with design tokens (dev-standards web-frontend-design.md); do it per module after M4

## Not now

- Rebuild the portal in Next.js
- Supabase or any hosted database (self-hosted Postgres was chosen on purpose)
- Selling or multi-household onboarding (the data model already allows it; no UI)
- Push notifications beyond the current alert settings
- befish.cc rebuild (separate project)

## Issues to be addressed

Found in the 2026-10-04 review. Move into a milestone when they block something.

- [ ] Delete the unused GitHub Actions secrets: FTP_HOST, FTP_USERNAME, FTP_PASSWORD, SSH_PRIVATE_KEY (and VITE_API_KEY once removed from the workflow). Two minutes, no code.
- [ ] `liora-homeschool-plan.md` is in a public repo and contains personal details about Liora. Scrub it or move it out of the repo.
- [ ] Deploy step does `rm -rf /var/www/liora-academy/*` before copying: the site is empty or half-updated during every deploy, a failed copy leaves it empty, and no previous build is kept for rollback. Proposed fix (decided in chat 2026-10-04, pending approval): publish each build to a new release folder and switch a `current` symlink atomically; rollback becomes one command. Needs a one-time server prep and a one-line Nginx `root` change.
- [ ] `AUTO_MIGRATE=true` applies new migrations the moment the API container restarts, ahead of any backup. Consider `false` plus a manual `npm run migrate` after `db/backup.sh`.
- [ ] `db/bin/` duplicates `db/cli/`; keep one (the README documents `cli/`).
- [ ] Root clutter: `claude-code-prompt.md`, the untouched Vite template README
- [ ] The laptop clone at D:\coding\liora-academy is behind GitHub. Decide whether it is kept in sync or removed.
- [ ] **"Today" is computed in UTC, not local time.** `today()` in `src/App.jsx` (and several other `toISOString().split("T")[0]` date keys) use the UTC date, so after about 6 PM Mountain (5 PM in winter) the portal shows tomorrow's lessons. The server timezone does not affect this; it runs in the browser. Fix: one shared local-date helper used everywhere. Small single-file change; do it right after M1, on its own branch.
- [ ] Login screen shows the default PIN hint (`App.jsx`, "Default PIN: 9999"). Low risk (soft lock), remove when the file is split.
- [ ] Monthly review of project instructions and dev-standards (next: Nov 4)

## Log

Newest first. One line per finished milestone: date, what shipped, decisions worth keeping.

- 2026-10-04 ROADMAP.md created; M1 specified.

# SPEC: M1 Cutover (portal goes live on the API)

Current milestone only. Claude Code: start in **Plan mode**, restate this milestone in your own words, list any questions, and wait for approval before changing anything. One milestone per session.

## Goal

The portal at school.theflairhub.com and 192.168.0.115 reads and writes through the API, the old PHP sync is gone from the code, and `main` contains everything the server runs (`db/`, `api/`, the new front end).

## Context (verified 2026-10-04)

- Branch `feat/frontend-api-sync` is ahead of `main` by the db/api work plus the front-end sync commits. There is no pull request. `main` has no `db/` or `api/`.
- The API container is already running on the homeserver with migrations 001 and 002 applied. The real data is imported (at import time: 140 lessons, 134 scheduled items, 17 completions for Liora).
- Merging to `main` triggers the deploy workflow, which builds the front end and copies `dist/*` to `/var/www/liora-academy`. The API container is **not** deployed by that workflow; it is rebuilt by hand with `docker compose` (see `api/DEPLOY.md`).
- The old PHP endpoint is retired, so the pre-cutover front end can no longer sync. Rollback is a revert-and-redeploy of the front end; data stays safe in Postgres.
- This milestone touches the deploy workflow (task 3) and the deploy itself, so it needs this SPEC and Joshua's approval at each [JOSHUA] step.

## Tasks

Tasks marked [CC] are for Claude Code. Tasks marked [JOSHUA] he does himself; each lists terminal, folder, and what it does.

### 1. [JOSHUA] Safety net first
- Terminal: VS Code on the server, folder `~/projects/liora-academy`.
  `bash db/backup.sh` takes a full database dump.
  Expected: a line like `2026-10-04T... saved /home/joshua3311/backups/homeschool/homeschool-2026-10-04-HHMM.sql.gz (NNNN bytes)`.
- Same terminal: `crontab -l` shows whether the nightly backup is scheduled.
  Expected: a line starting `15 2 * * * bash /home/joshua3311/projects/liora-academy/db/backup.sh`. If it is missing, add it as described at the top of `db/backup.sh`.
- **Done when:** a fresh backup file exists and `crontab -l` shows the nightly line.

### 2. [CC] Pre-merge check on `feat/frontend-api-sync`
Run, and report the tail of each output:
- repo root: `npm ci && npm run lint && npm run build`
- `db/`: `npm ci && npm test`
- `api/`: `npm ci && npm test` (including `api/test/sync-roundtrip.test.mjs`)
- **Done when:** all three pass. If anything fails, stop and report; do not fix by changing behavior.

### 3. [CC] Remove dead leftovers (one commit)
- Confirm nothing in `src/` still references `server/api.php` or `VITE_API_KEY` / `API_KEY`. Remove any that remain.
- In `.github/workflows/deploy.yml`, remove the `VITE_API_KEY` env line from the Build step. Change nothing else in that file (the deploy-step atomicity problem is on the ROADMAP issues list, not this milestone).
- `db/bin/` and `db/cli/` hold near-identical scripts. Diff them, keep `db/cli/` (the README documents it), delete `db/bin/`, and confirm `package.json` scripts point at `cli/`.
- Delete `claude-code-prompt.md` (a one-off prompt that has been used).
- **Done when:** `grep -rn "api.php\|VITE_API_KEY" src .github` prints nothing, `npm run build` still passes, and the diff touches only those items.

### 4. [CC] Add the three working docs
Add `CLAUDE.md`, `ROADMAP.md` and `SPEC.md` at the repo root exactly as drafted by Cowork (Joshua will place the draft files in the repo before this session). Do not edit their content.
- **Done when:** the three files are in the root and committed on the branch.

### 5. [JOSHUA] Open the pull request and merge
- Browser, github.com/rekot24/liora-academy: open a PR from `feat/frontend-api-sync` into `main`. Read the file list; it should be `db/`, `api/`, `src/`, the docs, and the small cleanup from task 3.
- Merge it. The deploy needs the Gitea mirror to catch up (hourly). To skip the wait: Gitea (100.109.2.31:3000) > liora-academy > Settings > Mirror Settings > "Synchronize Now".
- Watch Gitea > liora-academy > Actions for the run to turn green.
- **Done when:** the Actions run is green.

### 6. [JOSHUA] Verify on the live portal
Hard-refresh (Ctrl+Shift+R) at http://192.168.0.115, then check each:
1. The portal loads Liora's data. Expect at least 140 lessons, 134 scheduled items and 17 completions (Admin > Schedule > Curriculum, and the attendance view).
2. Mark a lesson complete on the laptop. On the phone, within about 30 seconds (the poll is 25s), it shows complete.
3. **The original bug:** add a throwaway lesson, delete it on one device, wait 30 seconds, reload on the other. It must stay deleted.
4. Turn Wi-Fi off on one device, mark something complete, turn Wi-Fi on. It appears on the other device within a minute.
5. Open https://school.theflairhub.com in a private window, sign in with the email code, repeat check 1.
6. Terminal, VS Code on the server: `curl -s http://127.0.0.1:3100/api/v1/health` returns `{"ok":true}`.
- **Done when:** all six pass.

### 7. [CC] Close out
- Add a Log line to ROADMAP.md (date, what shipped, any decision worth keeping) and tick M1 in "Done".
- Move anything unfinished from this SPEC into ROADMAP "Issues to be addressed".
- Reset this file to the empty template below. Commit as `docs: close out M1`.
- **Done when:** `SPEC.md` is the empty template and ROADMAP.md shows M1 done.

## Rollback

Triggers: a verification check fails and the cause is not obvious within about 30 minutes, the portal stops loading, or any request returns repeated 500s.
1. Terminal, VS Code on the server, `~/projects/liora-academy`: `git revert -m 1 <merge-commit>` on `main`, push, wait for the mirror and deploy.
2. The data is safe in Postgres. For a second copy first: `cd db && npm run export:legacy -- --student Liora`.
3. Only if data was damaged: restore from the backup using the instructions at the bottom of `db/backup.sh`.

## Not now

M2 student selector and Amari, grade tags, App.jsx split, lesson pages, deploy atomicity, `AUTO_MIGRATE`, scrubbing `liora-homeschool-plan.md`. They are on ROADMAP.md. New ideas go there, not here.

---

## Empty template (what this file resets to)

```
# SPEC: <milestone name>
Claude Code: start in Plan mode, restate this milestone, wait for approval. One milestone per session.
## Goal
## Context
## Tasks   (each: who, terminal + folder for commands, "Done when")
## Rollback
## Not now
```

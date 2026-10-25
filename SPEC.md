# SPEC: M1.1 Local-date fix ("today" is computed in UTC)
Claude Code: start in Plan mode, restate this milestone, wait for approval. One milestone per session.

## Goal
Every school-day key in the front end comes from the browser's local date, not the UTC date, so the portal still shows today's lessons in the evening. Front end only. Target: Sun Oct 25 (today).

## Context
- **The bug:** `today()` in `src/App.jsx` returns `new Date().toISOString().split("T")[0]`, which is the UTC date. UTC rolls to tomorrow at about 6 PM Mountain (5 PM in winter), so after that the portal shows tomorrow's lessons. The server timezone does not matter; this runs in the browser. Listed in ROADMAP "Issues to be addressed".
- **Why now:** January teaching runs on the current portal, and this is the only code change planned before the playbook work.
- **Date keys** are `"YYYY-MM-DD"` strings used as keys in `schedule`, `allLog` and similar. The format does not change, so there is no data migration.
- **Places to fix** (found by reading `main` on 2026-10-25; line numbers will drift, so search for the pattern):
  1. `today()` (about line 342). This is the bug.
  2. The schedule generator loop (about 454): `current.toISOString().split("T")[0]`.
  3. The streak calculation (about 722 and 725): `new Date(todayKey)` parses as UTC midnight, then `toISOString()` is used again.
  4. `WeeklyRoundup` (about 885 to 893): builds the week from the current time, so after 6 PM the week's days shift by one.
  5. `ScheduleCalendar` `dateKeyOf` (about 1325).
  6. The month grid (about 2249): `new Date(y, m, day).toISOString()...`.
- **Leave alone:** real timestamps (`exportedAt`, `savedAt`, `lastSyncedAt` in `App.jsx` and `src/lib/syncClient.js`) correctly stay UTC ISO strings. `formatDate` and every `new Date(key + "T12:00:00")` already use noon local time and are fine.
- The shared helper goes in `src/lib/dates.js` (`lib/` is for pure logic, per dev-standards).
- **Known side effect, not fixed here:** completions marked in the evening before this fix were stored under the next day's key. This fix does not repair them (see Not now).
- No migration, API or Nginx change, so `db/backup.sh` is not required.

## Tasks (each: who, terminal + folder for commands, "Done when")

1. **Plan and scan** (Claude Code, Plan mode). Restate the milestone. Search `src/` for any other UTC date-key patterns: `toISOString`, `.split("T")`, `slice(0, 10)`, and `new Date(<key>)` without a time. Check `api/` and `db/` for anything that decides "today" (`CURRENT_DATE`, `now()::date`). Report only; do not change `api/` or `db/`.
   Done when: Joshua has approved the final list of sites.

2. **Add the helper** (Claude Code). Create `src/lib/dates.js` with two exports and a short comment on why they exist:
   - `localDateKey(date = new Date())` returns `"YYYY-MM-DD"` built from `getFullYear()`, `getMonth()` and `getDate()`.
   - `dateFromKey(key)` returns `new Date(key + "T12:00:00")`, noon local, which is safe across daylight-saving changes.
   Done when: the file exists and needs no imports.

3. **Use it** (Claude Code). Import the helper in `src/App.jsx`. `today()` returns `localDateKey()`. Replace each `x.toISOString().split("T")[0]` on a date with `localDateKey(x)`. Change the streak start from `new Date(todayKey)` to `dateFromKey(todayKey)`. Change nothing else, and do not restructure `App.jsx`.
   Done when: the diff touches only those lines plus the import, and a search for `toISOString().split` finds no date-key uses.

4. **Check locally** (Claude Code runs these and shows the output; use the terminal and folder it works in, repo root).
   - `npm run lint` and `npm run build` pass.
   - Timezone check, in PowerShell in `D:\Coding\liora-academy` on the feature branch. It proves the helper gives the local date after 6 PM Mountain, in summer and in winter, and across the daylight-saving change on Nov 1. If Node rejects the import or ignores `TZ` on Windows, Claude Code adjusts the command.
     ```
     $env:TZ = "America/Denver"
     node --input-type=module -e "
     import { localDateKey, dateFromKey } from './src/lib/dates.js';
     console.log(localDateKey(new Date('2026-10-26T01:30:00Z')));
     console.log(localDateKey(new Date('2026-11-02T01:30:00Z')));
     const d = dateFromKey('2026-11-02'); d.setDate(d.getDate() - 2);
     console.log(localDateKey(d));"
     Remove-Item Env:TZ
     ```
     Expected output, one per line: `2026-10-25`, then `2026-11-01`, then `2026-10-31`.
   Done when: lint and build pass and the three lines match.

5. **Branch, commit, PR** (Claude Code prepares; Joshua pushes). Branch `fix/local-date-keys`. Claude Code gives the exact commands, the terminal and folder, and a detailed commit message (summary line `fix: use local date for school-day keys`, then Why / What changed / Verified / Notes). Joshua pushes from his PC (PowerShell in `D:\Coding\liora-academy`; if Git asks for a GitHub login, sign in once), opens the PR into `main` and merges. Then use "Synchronize Now" in Gitea (or wait for the hourly mirror) and watch the Gitea Action finish.
   Done when: the Action is green and the new build is served.

6. **Verify after deploy** (Joshua). Deployed means verified.
   - Hard refresh first (Ctrl+Shift+R), because the browser can keep the old front end after a deploy (known issue).
   - Before 5 PM: the student dashboard shows today's lessons.
   - After 6 PM Mountain (after 5 PM once clocks go back): the dashboard still shows today's lessons, and the date in the header and the calendar highlight today, not tomorrow.
   - In the evening, Weekly Roundup's current day is today's weekday, and the month calendar's highlighted cell is today's date.
   - The streak number in the evening matches the number you saw in the morning.
   - These are look-only checks. Do not change real data to test.
   Done when: every line above holds.

7. **Close out** (Claude Code; Joshua reviews the commit). Add a ROADMAP Log line for M1.1 and tick the "Today is computed in UTC" item under Issues. Record any extra sites found in task 1 and not fixed as new Issues. Reset SPEC.md to its empty template.
   Done when: ROADMAP is updated and SPEC.md is back to the empty template.

## Rollback
Front end only and no data is changed, so rollback is a revert. In PowerShell in `D:\Coding\liora-academy`, on `main` after `git pull`: `git revert -m 1 <merge commit hash>`, then `git push`, then Synchronize Now in Gitea and wait for the Action. This returns the old behavior (tomorrow's lessons after 6 PM). Verify with a hard refresh. No backup or data cleanup is needed because the date-key format never changed.

## Not now
- A household timezone setting (belongs to the settings store in the rebuild, R1).
- Repairing completions that were recorded under the wrong date in the evenings. Joshua can check the attendance calendar for evening entries and decide; any data change gets its own SPEC and a backup first.
- Changing real timestamps (`exportedAt`, `savedAt`, `lastSyncedAt`).
- Splitting up or restructuring `App.jsx` (rebuild track).
- The default PIN hint and the other open Issues.

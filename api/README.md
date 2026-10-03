# api/ — Liora's Academy HTTP API

A small Node service (Fastify + `pg`) that reads and writes the Postgres tables defined in `../db`.
It runs as a Docker container on the server, listens on `127.0.0.1:3100`, and Nginx forwards
`/api/` to it. Nothing outside the server can reach it directly.

## Why it is shaped this way

The old app saved ONE JSON file containing everything, last write wins, so a device holding an old
copy overwrote newer work. This API is granular: each request names only the rows it changes.
`PATCH` bodies are merge-patches (`null` = remove). A stale device can only touch what it names, and
writes about things that no longer exist (a deleted lesson) are skipped and reported in `ignored`
instead of bringing them back. Every write runs in one transaction: all of it applies or none of it.

## Endpoints (all under `/api/v1`)

| Method | Path | Body |
|---|---|---|
| GET | `/health` | — |
| GET | `/me` | household and its students |
| GET | `/students/:id/snapshot` | everything for one student, in the shape the app already uses. Sends an `ETag`; an unchanged answer is a 304 |
| PATCH | `/students/:id/log` | `{ "2026-10-02": { "<lesson>": true \| "skipped" \| false \| null } }` |
| PATCH | `/students/:id/grades` | `{ date: { lesson: {type:"pass_fail",value:"pass"} \| {type:"score",value,max} \| null } }` |
| PATCH | `/students/:id/skills` | `{ "ls001": true, "ls001_date": "2026-10-02" }` (null removes) |
| PATCH | `/students/:id/alerts` | `{ "2026-10-02:<lesson>": "09:30" \| null }` |
| PATCH | `/students/:id/schedule` | `{ date: [items] \| null }` (an array replaces that day) |
| PATCH | `/students/:id/overrides` | `{ date: "SKIP" \| [items] \| null }` |
| PUT | `/students/:id/pattern` | `[{ subject, days:[0-6] }]` for the active semester |
| PATCH | `/students/:id/semesters` | `{ semesters?: {...}, remove?: [slug], activeSemester? }` (nothing is removed unless named) |
| PATCH | `/students/:id/field-trips` | `{ upsert: [{id, date, place, ...}], remove: [id] }` |
| PATCH | `/students/:id/extracurriculars` | `{ upsert: [{id, name, days, ...}], remove: [id] }` |
| PUT | `/students/:id/evaluation` | `{ label, status, dueDate, showFrom }` |
| PUT | `/students/:id/alert-settings` | `{ browser, apollo }` |
| PATCH | `/catalog` | `{ subjects?, lessons: { upsert: [...], remove: [...] }, order? }` |
| PATCH | `/life-skills` | `{ upsert: [{id, category, title}], remove: [id], order: [id] }` |
| POST | `/students` | `{ name, gradeLabel?, email? }` |

Removing a lesson nobody has used deletes it; one that was scheduled, completed or graded is archived.
`remove` reports `"deleted"`, `"archived"` or `"missing"` per lesson.

## Who is calling

`src/auth.mjs` is the only place identity is decided. Today every request is treated as the owner of
the single household. For per-person logins or other families, change that one function (the
Cloudflare Access header and the `household_members` table are already there for it).

## Tests

```bash
cd api && npm install && npm test
# also replay a real export through the API (keep real exports OUT of git):
LEGACY_BACKUP=/path/to/liora-academy-backup.json npm test
```

The tests include a replay that rebuilds a whole student, from nothing, using only API calls, and
checks the result matches the original snapshot. That proves the API can express everything the app saves.

## Deploying on the server

See `DEPLOY.md` for the full checklist (backup first, smoke tests, rollback). In short: create `api/.env` from `.env.example`, then
`cd api && docker compose up -d --build`, then add the Nginx `/api/` location below and reload Nginx.

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    client_max_body_size 6m;
}
```

## Settings that matter

Set in `api/.env`: `DATABASE_URL` (required), `PORT` (default 3100), `HOST` (default 127.0.0.1, leave it),
`AUTO_MIGRATE` (default true), `HOUSEHOLD_ID` (only needed if you ever have more than one household).

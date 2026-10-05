# CLAUDE.md

Read this fully before touching code. Then read **SPEC.md** and follow it; it is the one milestone in progress. **ROADMAP.md** is the longer path and holds the "not now" list.

## What this is

Liora's Academy: a React/Vite portal at school.theflairhub.com for Liora (12, grade 7) and Amari (13, grade 8, joins January 2027). Interactive, AI-assisted classical education plus everyday skills; Colorado requirements are the floor. Joshua is the only admin and user. He is learning: explain why before what, and push back when there is a better approach.

## How to work

1. Start in Plan mode. Restate the SPEC.md milestone, list questions, wait for approval.
2. One milestone per session. New ideas go on ROADMAP.md "Not now", not into the build.
3. Follow rekot24/dev-standards (`web-app-framework.md`, `web-frontend-design.md`). If something conflicts, or looks outdated, stop, explain, recommend, and wait. Anything already listed under "Known deviations" below is settled and does not need re-raising.
4. For every command you give Joshua, say which terminal (VS Code on the server, or PowerShell), which folder, and what it does in one sentence. Show expected output.
5. Work on a feature branch. `main` must always be deployable; a merge to `main` deploys the front end.
6. Finish by closing out in ROADMAP.md (log line, tick the milestone) and resetting SPEC.md to its empty template.

## Safety

- Never ask for, print, or commit passwords or tokens. Secrets live in Proton Pass and in `.env` files that are gitignored.
- The repo is **public**. Never commit exports, backups, `.env` files, or personal details about the children.
- Run `bash db/backup.sh` before any merge that includes a new migration or an API change.
- Do not edit inside Gitea's folders (`/data/gitea`, `/data/git/repositories`).

## Architecture and where things are

- **Front end:** React + Vite in `src/`. `src/App.jsx` is still one large file (see deviations). `src/lib/syncClient.js` does the API sync; `src/constants/index.js` holds named values. Browser keeps a localStorage cache; the server is authoritative.
- **API:** Fastify in `api/`, Docker container `homeschool-api`, listens on `127.0.0.1:3100`, Nginx forwards `/api/` to it. Identity is decided only in `api/src/auth.mjs`. Details: `api/README.md`, `api/DEPLOY.md`.
- **Database:** Postgres in the Docker container `postgres` (superuser `life`), database `homeschool`, app login `homeschool_app`. Schema and migrations in `db/` (numbered, immutable: add a new file, never edit an applied one). Design decisions: `db/DESIGN.md`.
- **Access:** public through Cloudflare Tunnel + Cloudflare Access (email code). On the home network there is no login.
- **Server:** homelab, Ubuntu on a UM790 Pro, 192.168.0.115. Full details in rekot24/homelab.

## Deploy

- Front end: merge a PR into `main` > Gitea mirror pulls from GitHub (hourly; "Synchronize Now" in Gitea to skip the wait) > Gitea Actions builds and copies `dist/*` to `/var/www/liora-academy`, which Nginx serves.
- API: **manual**, not part of the workflow. On the server in `~/projects/liora-academy/api`: `docker compose up -d --build`. Follow `api/DEPLOY.md`. Migrations apply at container start (`AUTO_MIGRATE`).
- Working clones are in `~/projects/<repo>` on the server. Edit and push from there (VS Code Remote-SSH carries his GitHub login).

## Commands

- Front end (repo root): `npm ci`, `npm run lint`, `npm run build`, `npm run dev`
- `db/`: `npm test`, `npm run migrate`
- `api/`: `npm test`

## Known deviations from dev-standards (settled, with the reason and the fix)

| Deviation | Why | Fixed by |
|---|---|---|
| Standards assume Supabase and Vercel; this project uses self-hosted Postgres, Fastify and Cloudflare | Chosen Oct 2026: no spare RAM for self-hosted Supabase, data stays at home | Standards proposal: add a self-hosted stack variant |
| `src/App.jsx` is one ~3,400-line file with inline styles | Grew organically before the standards were adopted | ROADMAP M4 |
| No settings store, feature flags, logger or error boundary in the front end | Same | ROADMAP M4 |
| No `app_logs` table | Not needed yet | Revisit with M4 |
| Student PINs are client-side soft locks | Family tool behind Cloudflare Access | Per-person logins (Later) |

## Where facts live

Repo facts (architecture, ports, deploy steps, commands) live here. How we work lives in the project instructions. The path lives in ROADMAP.md, the current step in SPEC.md. Keep each fact in one place.

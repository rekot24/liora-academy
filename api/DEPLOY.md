# Deploy checklist: homeschool-api

Customised from the deploy-checklist template for this setup (one server, one family, Docker + Nginx).

## Pre-deploy
- [ ] `cd db && npm test` and `cd api && npm test` pass (with `LEGACY_BACKUP=...` set, they also check your real export)
- [ ] Branch merged to `main`, or you are deploying from the branch on purpose
- [ ] A backup exists: `bash db/backup.sh` ran once and printed "saved ..." (this is the rollback for the database)
- [ ] `api/.env` exists on the server (copy of `.env.example`, real password filled in, never committed)
- [ ] You know where Nginx's config for school.theflairhub.com lives (`sudo nginx -T | grep -n liora`)

## Deploy
1. `cd ~/projects/liora-academy && git pull`
2. `cd api && docker compose up -d --build`   (first build takes a minute or two)
3. Smoke tests, on the server:
   - `docker logs homeschool-api --tail 20`   shows "database schema is up to date" and no errors
   - `curl -s http://127.0.0.1:3100/api/v1/health`   returns `{"ok":true}`
   - `curl -s http://127.0.0.1:3100/api/v1/me`   returns the household and its students
4. Add the Nginx `/api/` block (see `api/README.md`), then `sudo nginx -t` and `sudo systemctl reload nginx`
5. Through Nginx: `curl -s http://192.168.0.115/api/v1/health`

## Post-deploy
- [ ] Container shows `healthy` in `docker ps` after a minute
- [ ] Add the nightly backup to cron (see the top of `db/backup.sh`)
- [ ] Note the date and what was deployed in `liora-homeschool-plan.md`

## Rollback triggers (decide now, not during)
- `/api/v1/health` fails or the container keeps restarting
- any request returns 500 repeatedly
- the portal at school.theflairhub.com stops loading

## Rollback
1. Remove the `/api/` block from Nginx, `sudo nginx -t`, reload. The portal itself is unaffected: it does not call the API until the front-end change ships.
2. `cd api && docker compose down`
3. Only if data was damaged: restore from the backup (instructions at the bottom of `db/backup.sh`).

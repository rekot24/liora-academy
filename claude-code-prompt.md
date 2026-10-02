# Prompt to paste into Claude Code (run it from the root of your liora-academy repo)

I'm adding a new `db/` folder to this repo from a zip I downloaded: `liora-academy-db-layer.zip`
(it is at <PATH TO ZIP>). Please do this and stop before anything is deployed:

1. Make sure the working tree is clean, then create a branch `data-layer-schema` from `main`.
   Do NOT commit to `main`: a push to `main` triggers my auto-deploy.
2. Unzip the archive into the repo root so it creates `db/` (it must not touch anything else).
3. Check that `db/` is self-contained: `cd db && npm install && npm test`. All tests should pass.
   Do not change the repo-root `package.json` or lockfile.
4. Confirm `git status` shows only new files under `db/`, and that no real backup/export JSON
   (`liora-academy-backup*.json`) is staged. This repo is public and that file holds my child's records.
5. Commit with the message "Add db/: Postgres schema, migration, parity tests" and push the branch.
   Show me the compare URL. Do not merge.

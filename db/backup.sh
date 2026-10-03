#!/usr/bin/env bash
# Nightly backup of the homeschool database.
#   bash db/backup.sh                 # run once by hand to test
#   crontab -e  ->  15 2 * * * bash /home/joshua3311/projects/liora-academy/db/backup.sh >> /home/joshua3311/backups/homeschool/backup.log 2>&1
#
# What it does: asks the Postgres container for a full dump of the `homeschool` database, compresses
# it, saves it in ~/backups/homeschool/, and deletes backups older than 30 days (only files this
# script created, named homeschool-*.sql.gz). It never touches your other databases.
#
# Override any of these by setting the variable before the command, e.g.  PG_SUPERUSER=other bash db/backup.sh
set -euo pipefail

CONTAINER="${PG_CONTAINER:-postgres}"
SUPERUSER="${PG_SUPERUSER:-life}"
DATABASE="${PG_DATABASE:-homeschool}"
DIR="${BACKUP_DIR:-$HOME/backups/homeschool}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$DIR"
FILE="$DIR/$DATABASE-$(date +%F-%H%M).sql.gz"

docker exec "$CONTAINER" pg_dump -U "$SUPERUSER" -d "$DATABASE" --no-owner | gzip > "$FILE"

# a dump that is nearly empty means something went wrong: fail loudly instead of keeping a useless file
SIZE=$(stat -c %s "$FILE")
if [ "$SIZE" -lt 2000 ]; then
  echo "backup looks too small ($SIZE bytes): $FILE" >&2
  exit 1
fi

find "$DIR" -name "$DATABASE-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) saved $FILE ($SIZE bytes)"

# To restore into an EMPTY database (ask before doing this; it is the rollback plan):
#   docker exec -it postgres psql -U life -d postgres -c 'CREATE DATABASE homeschool_restore OWNER homeschool_app;'
#   gunzip -c ~/backups/homeschool/<file>.sql.gz | docker exec -i postgres psql -U life -d homeschool_restore

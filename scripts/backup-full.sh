#!/usr/bin/env bash
# ==============================================================================
# ChekUp247 — FULL backup for VPS migration / disaster recovery
#
# Run on the CURRENT production VPS:
#     cd /opt/chekup247 && sudo bash scripts/backup-full.sh [--quiesce]
#
# Produces ONE archive containing everything needed to rebuild the platform on a
# fresh server (restore it there with scripts/restore-full.sh):
#   - operational Postgres  (pg_dump, custom format)
#   - patient Postgres      (pg_dump, custom format)
#   - MinIO volume          (uploaded documents, prescriptions, attachments)
#   - Redis volume          (BullMQ queues; optional but cheap)
#   - Caddy data volume     (Let's Encrypt certs + account key)
#   - .env.production / .env (secrets: JWT, DB, Paystack, Daily, Brevo, ...)
#   - git commit + any uncommitted local changes on the VPS
#
# Options:
#   --quiesce        Stop the API while backing up so DB + MinIO are consistent
#                    with each other (a minute or two of API downtime). Use this
#                    for the FINAL backup right before cutover.
#   --out DIR        Where to write the archive (default /var/backups/chekup247-migration)
#   --app-dir DIR    Project directory (default /opt/chekup247)
#
# The archive contains patient data and production secrets. It is created with
# mode 600. Move it over SSH only, and delete every copy once the migration is
# verified.
# ==============================================================================
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/chekup247}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
OUT_DIR="${OUT_DIR:-/var/backups/chekup247-migration}"
QUIESCE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --quiesce) QUIESCE=true ;;
    --out) OUT_DIR="$2"; shift ;;
    --app-dir) APP_DIR="$2"; shift ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker not found"
[ -d "$APP_DIR" ] || die "App dir $APP_DIR not found (use --app-dir)"
cd "$APP_DIR"
[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found in $APP_DIR"
[ -f .env.production ] || die ".env.production not found in $APP_DIR"

DC=(docker compose -f "$COMPOSE_FILE")
OP_C=chekup-operational-postgres
PT_C=chekup-patient-postgres
for c in "$OP_C" "$PT_C" chekup-minio chekup-redis chekup-caddy; do
  [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null || echo false)" = "true" ] \
    || die "Container $c is not running — backup must be taken from the live stack"
done

mkdir -p "$OUT_DIR"
TS=$(date -u +%Y%m%d_%H%M%SZ)
WORK=$(mktemp -d "$OUT_DIR/.work.XXXXXX")
ARCHIVE="$OUT_DIR/chekup247-backup-$TS.tar"
API_STOPPED=false

cleanup() {
  if [ "$API_STOPPED" = true ]; then
    log "Restarting API..."
    "${DC[@]}" start api || echo "WARNING: could not restart api — run: ${DC[*]} start api" >&2
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# Resolve the docker volume that backs <container>:<mount-path>
volume_of() {
  docker inspect -f '{{range .Mounts}}{{if eq .Destination "'"$2"'"}}{{.Name}}{{end}}{{end}}' "$1"
}

backup_volume() { # <container> <mount-path> <outfile>
  local vol
  vol=$(volume_of "$1" "$2")
  [ -n "$vol" ] || die "No named volume mounted at $2 in $1"
  log "Archiving volume $vol -> $(basename "$3")"
  docker run --rm -v "$vol":/data:ro alpine:3 tar czf - -C /data . > "$3"
}

dump_db() { # <container> <outfile>
  log "Dumping Postgres in $1 -> $(basename "$2")"
  docker exec "$1" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' > "$2"
  # Sanity check: the dump must be readable as a pg_restore archive
  docker exec -i "$1" pg_restore --list < "$2" > /dev/null || die "Dump $2 failed verification"
}

if [ "$QUIESCE" = true ]; then
  log "Stopping API for a consistent snapshot..."
  "${DC[@]}" stop api
  API_STOPPED=true
fi

mkdir -p "$WORK/config" "$WORK/volumes"

dump_db "$OP_C" "$WORK/operational.dump"
dump_db "$PT_C" "$WORK/patient.dump"

backup_volume chekup-minio /data "$WORK/volumes/minio_data.tar.gz"
backup_volume chekup-redis /data "$WORK/volumes/redis_data.tar.gz"
backup_volume chekup-caddy /data "$WORK/volumes/caddy_data.tar.gz"

log "Saving configuration..."
cp .env.production "$WORK/config/.env.production"
[ -f .env ] && cp .env "$WORK/config/.env"
if git rev-parse --git-dir >/dev/null 2>&1; then
  git rev-parse HEAD > "$WORK/config/git-commit.txt"
  git diff HEAD > "$WORK/config/local-changes.patch" || true
  [ -s "$WORK/config/local-changes.patch" ] \
    && echo "NOTE: the VPS has uncommitted changes — saved to local-changes.patch (review before reusing)"
fi

cat > "$WORK/MANIFEST.txt" <<EOF
ChekUp247 full backup
created_utc=$TS
source_host=$(hostname)
compose_file=$COMPOSE_FILE
quiesced=$QUIESCE
EOF

log "Computing checksums..."
( cd "$WORK" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS )

log "Building final archive..."
tar cf "$ARCHIVE" -C "$WORK" .
chmod 600 "$ARCHIVE"
( cd "$OUT_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256" )

echo
echo "===================================================================="
echo " Backup complete: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
echo "===================================================================="
echo " Copy it to the new VPS (from the NEW server, or from here):"
echo "   rsync -avP --partial $ARCHIVE $ARCHIVE.sha256 root@NEW_VPS_IP:/root/"
echo
echo " Then on the new VPS:"
echo "   cd /opt/chekup247 && sudo bash scripts/restore-full.sh /root/$(basename "$ARCHIVE")"
echo "===================================================================="

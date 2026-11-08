#!/usr/bin/env bash
# ==============================================================================
# ChekUp247 — FULL restore (counterpart of scripts/backup-full.sh)
#
# Run on the NEW VPS, after:
#   1. sudo bash scripts/setup-vps.sh        (installs Docker, firewall)
#   2. git clone <repo> /opt/chekup247        (so compose files + Caddyfile exist)
#   3. docker login ghcr.io -u <user>         (only if the images are private)
#
#     cd /opt/chekup247 && sudo bash scripts/restore-full.sh /root/chekup247-backup-XXXX.tar
#
# Options:
#   --no-certs     Do NOT restore the Caddy data volume (Caddy will request new
#                  Let's Encrypt certificates once DNS points at this server).
#   --force        Restore even if the databases here already contain tables
#                  (this OVERWRITES them).
#   --app-dir DIR  Project directory (default /opt/chekup247)
# ==============================================================================
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/chekup247}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RESTORE_CERTS=true
FORCE=false
ARCHIVE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --no-certs) RESTORE_CERTS=false ;;
    --force) FORCE=true ;;
    --app-dir) APP_DIR="$2"; shift ;;
    -h|--help) sed -n '2,21p' "$0"; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) ARCHIVE="$1" ;;
  esac
  shift
done

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

[ -n "$ARCHIVE" ] || die "Usage: restore-full.sh [options] <backup.tar>"
[ -f "$ARCHIVE" ] || die "Archive not found: $ARCHIVE"
command -v docker >/dev/null || die "docker not found — run scripts/setup-vps.sh first"
[ -d "$APP_DIR" ] || die "$APP_DIR not found — clone the repo there first"
cd "$APP_DIR"
[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found in $APP_DIR"

DC=(docker compose -f "$COMPOSE_FILE")
OP_C=chekup-operational-postgres
PT_C=chekup-patient-postgres

# Verify the archive checksum if the .sha256 sits next to it
if [ -f "$ARCHIVE.sha256" ]; then
  log "Verifying archive checksum..."
  ( cd "$(dirname "$ARCHIVE")" && sha256sum -c "$(basename "$ARCHIVE").sha256" ) || die "Archive checksum mismatch"
fi

WORK=$(mktemp -d /root/.chekup-restore.XXXXXX)
trap 'rm -rf "$WORK"' EXIT
log "Extracting archive..."
tar xf "$ARCHIVE" -C "$WORK"
( cd "$WORK" && sha256sum -c --quiet SHA256SUMS ) || die "Contents failed checksum verification"
cat "$WORK/MANIFEST.txt"

# ---- configuration -----------------------------------------------------------
log "Installing configuration files..."
for f in .env.production .env; do
  if [ -f "$WORK/config/$f" ]; then
    [ -f "$f" ] && cp "$f" "$f.bak.$(date +%s)"
    cp "$WORK/config/$f" "$f"
    chmod 600 "$f"
  fi
done
if [ -s "$WORK/config/local-changes.patch" ]; then
  echo "NOTE: the old VPS had uncommitted changes (config/local-changes.patch in the archive)."
  echo "      They were NOT applied. Review them if you relied on local edits."
fi

# ---- images + containers -------------------------------------------------------
log "Pulling images..."
"${DC[@]}" pull || die "Image pull failed — if the images are private run: docker login ghcr.io"
log "Creating containers and volumes (not starting)..."
"${DC[@]}" up --no-start

volume_of() {
  docker inspect -f '{{range .Mounts}}{{if eq .Destination "'"$2"'"}}{{.Name}}{{end}}{{end}}' "$1"
}

wait_healthy() { # <container>
  local i state
  for i in $(seq 1 40); do
    state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$1")
    [ "$state" = "healthy" ] && return 0
    sleep 3
  done
  die "$1 did not become healthy"
}

table_count() { # <container>
  echo "select count(*) from pg_tables where schemaname='public'" \
    | docker exec -i "$1" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA'
}

restore_db() { # <container> <dumpfile>
  local n
  n=$(table_count "$1")
  if [ "$n" -gt 0 ] && [ "$FORCE" != true ]; then
    die "$1 already has $n tables. Re-run with --force to overwrite."
  fi
  log "Restoring $(basename "$2") into $1..."
  # --clean --if-exists lets this succeed on an empty DB or one TypeORM already populated
  docker exec -i "$1" sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --exit-on-error' < "$2"
}

restore_volume() { # <container> <archive>
  local vol
  vol=$(volume_of "$1" /data)
  [ -n "$vol" ] || die "No volume at /data for $1"
  log "Restoring volume $vol from $(basename "$2")..."
  docker run --rm -i -v "$vol":/data alpine:3 sh -c \
    'find /data -mindepth 1 -maxdepth 1 -exec rm -rf {} + ; tar xzf - -C /data' < "$2"
}

# ---- databases -------------------------------------------------------------------
log "Starting databases..."
"${DC[@]}" up -d operational-postgres patient-postgres
wait_healthy "$OP_C"
wait_healthy "$PT_C"
restore_db "$OP_C" "$WORK/operational.dump"
restore_db "$PT_C" "$WORK/patient.dump"

# ---- file volumes (services must be stopped while we overwrite their data) ---------
"${DC[@]}" stop minio redis caddy 2>/dev/null || true
restore_volume chekup-minio "$WORK/volumes/minio_data.tar.gz"
restore_volume chekup-redis "$WORK/volumes/redis_data.tar.gz"
if [ "$RESTORE_CERTS" = true ]; then
  restore_volume chekup-caddy "$WORK/volumes/caddy_data.tar.gz"
else
  log "Skipping Caddy certificates (--no-certs)"
fi

# ---- bring everything up -----------------------------------------------------------
log "Starting full stack..."
"${DC[@]}" up -d --remove-orphans

log "Waiting for API to become healthy..."
for i in $(seq 1 40); do
  state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' chekup-api 2>/dev/null || echo missing)
  if [ "$state" = "healthy" ] || [ "$state" = "running" ]; then break; fi
  sleep 3
done
"${DC[@]}" ps

echo
echo "===================================================================="
echo " Restore complete."
echo
echo " Before switching DNS, test this server directly from your laptop by"
echo " adding to your hosts file (replace IP):"
echo "   NEW_VPS_IP chekup247.com doctor.chekup247.com admin.chekup247.com api.chekup247.com storage.chekup247.com"
echo
echo " Then follow docs/VPS_MIGRATION.md (DNS cutover + GitHub secrets)."
echo "===================================================================="

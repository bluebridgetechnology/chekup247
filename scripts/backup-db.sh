#!/usr/bin/env bash
# ==============================================================================
# ChekUp247 Telehealth Platform — Database Backup Automation (OPS-1001)
# ==============================================================================
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/chekup247}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Operational DB Credentials
OP_DB_HOST="${OPERATIONAL_DB_HOST:-localhost}"
OP_DB_PORT="${OPERATIONAL_DB_PORT:-5432}"
OP_DB_USER="${OPERATIONAL_DB_USER:-chekup_user}"
OP_DB_NAME="${OPERATIONAL_DB_NAME:-chekup_operational}"

# Patient DB Credentials (RDS / Af-South-1 / Local)
PATIENT_DB_HOST="${PATIENT_DB_HOST:-localhost}"
PATIENT_DB_PORT="${PATIENT_DB_PORT:-5433}"
PATIENT_DB_USER="${PATIENT_DB_USER:-chekup_user}"
PATIENT_DB_NAME="${PATIENT_DB_NAME:-chekup_patient}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting ChekUp247 Database Backup..."
mkdir -p "$BACKUP_DIR"

# 1. Backup Operational Database
OP_FILE="${BACKUP_DIR}/operational_${OP_DB_NAME}_${TIMESTAMP}.sql.gz"
echo "Dumping Operational DB (${OP_DB_NAME}) to ${OP_FILE}..."
PGPASSWORD="${OPERATIONAL_DB_PASSWORD:-chekup_password}" pg_dump \
  -h "$OP_DB_HOST" \
  -p "$OP_DB_PORT" \
  -U "$OP_DB_USER" \
  --format=custom \
  --no-owner \
  --no-privileges \
  "$OP_DB_NAME" | gzip > "$OP_FILE"

# 2. Backup Patient Encrypted DB
PATIENT_FILE="${BACKUP_DIR}/patient_${PATIENT_DB_NAME}_${TIMESTAMP}.sql.gz"
echo "Dumping Patient DB (${PATIENT_DB_NAME}) to ${PATIENT_FILE}..."
PGPASSWORD="${PATIENT_DB_PASSWORD:-chekup_password}" pg_dump \
  -h "$PATIENT_DB_HOST" \
  -p "$PATIENT_DB_PORT" \
  -U "$PATIENT_DB_USER" \
  --format=custom \
  --no-owner \
  --no-privileges \
  "$PATIENT_DB_NAME" | gzip > "$PATIENT_FILE"

# 3. Generate SHA-256 Checksums for Data Integrity
sha256sum "$OP_FILE" > "${OP_FILE}.sha256"
sha256sum "$PATIENT_FILE" > "${PATIENT_FILE}.sha256"
echo "Integrity checksums generated."

# 4. Optional Cloud Storage Sync (S3 / MinIO / AWS RDS PITR)
if [ -n "${STORAGE_BACKUP_S3_BUCKET:-}" ]; then
  echo "Syncing backups to S3 bucket ${STORAGE_BACKUP_S3_BUCKET}..."
  aws s3 cp "$OP_FILE" "s3://${STORAGE_BACKUP_S3_BUCKET}/db-backups/operational/"
  aws s3 cp "$PATIENT_FILE" "s3://${STORAGE_BACKUP_S3_BUCKET}/db-backups/patient/"
fi

# 5. Retention Pruning (Remove backups older than retention days)
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name "*.sha256" -mtime +"$RETENTION_DAYS" -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ChekUp247 Database Backup Completed Successfully."

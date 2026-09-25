#!/usr/bin/env bash
# ==============================================================================
# ChekUp247 — Production & Staging Mock Data Purge Script
# Cleans all mock patients, mock bookings, consultations, prescriptions,
# medical profiles, and documents while STRICTLY PRESERVING admin users.
#
# Target: Ubuntu VPS with Docker Compose (or direct PostgreSQL)
# Usage:
#   chmod +x scripts/clean-mock-data.sh
#   ./scripts/clean-mock-data.sh
# ==============================================================================

set -euo pipefail

echo "===================================================================="
echo " ChekUp247 — Cleaning Mock Patients & Clinical Data"
echo "===================================================================="

# Auto-load environment variables if .env.production or .env exists
if [ -f .env.production ]; then
  set -a
  source .env.production
  set +a
elif [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Container names (from docker-compose.prod.yml & docker-compose.yml)
PATIENT_CONTAINER="${PATIENT_CONTAINER:-chekup-patient-postgres}"
OPERATIONAL_CONTAINER="${OPERATIONAL_CONTAINER:-chekup-operational-postgres}"
DB_USER="${POSTGRES_USER:-${OPERATIONAL_DB_USER:-chekup_prod_user}}"
PATIENT_DB="${PATIENT_DB:-${PATIENT_DB_NAME:-chekup_patient}}"
OPERATIONAL_DB="${OPERATIONAL_DB:-${OPERATIONAL_DB_NAME:-chekup_operational}}"

echo "Target Patient DB: ${PATIENT_CONTAINER} / ${PATIENT_DB}"
echo "Target Operational DB: ${OPERATIONAL_CONTAINER} / ${OPERATIONAL_DB} (User: ${DB_USER})"
echo ""

# Helper to execute query inside docker container
run_patient_sql() {
  local sql="$1"
  if command -v docker >/dev/null 2>&1 && docker ps -q -f name="${PATIENT_CONTAINER}" | grep -q .; then
    docker exec "${PATIENT_CONTAINER}" psql -U "${DB_USER}" -d "${PATIENT_DB}" -c "${sql}"
  elif [ -n "${PATIENT_DB_URL:-}" ]; then
    psql "${PATIENT_DB_URL}" -c "${sql}"
  else
    psql -U "${DB_USER}" -d "${PATIENT_DB}" -c "${sql}"
  fi
}

run_operational_sql() {
  local sql="$1"
  if command -v docker >/dev/null 2>&1 && docker ps -q -f name="${OPERATIONAL_CONTAINER}" | grep -q .; then
    docker exec "${OPERATIONAL_CONTAINER}" psql -U "${DB_USER}" -d "${OPERATIONAL_DB}" -c "${sql}"
  elif [ -n "${OPERATIONAL_DB_URL:-}" ]; then
    psql "${OPERATIONAL_DB_URL}" -c "${sql}"
  else
    psql -U "${DB_USER}" -d "${OPERATIONAL_DB}" -c "${sql}"
  fi
}

echo "1. Checking Admin accounts in Operational DB (guaranteed preservation)..."
run_operational_sql "SELECT id, email, role, full_name, status FROM users WHERE role = 'admin';"

echo ""
echo "2. Purging mock patient records from Patient Database (${PATIENT_DB})..."
run_patient_sql "
TRUNCATE TABLE 
  notifications,
  patient_documents,
  patient_medical_profiles,
  wallet_credits,
  reviews,
  disputes,
  payments,
  consultation_extensions,
  prescriptions,
  consultations,
  bookings
CASCADE;
"
echo "✅ Patient DB clinical mock records truncated."

echo ""
echo "3. Removing mock patients and notification preferences from Operational DB (${OPERATIONAL_DB})..."
run_operational_sql "
DELETE FROM notification_preferences 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE role = 'patient' 
    AND role != 'admin'
);

DELETE FROM users 
WHERE role = 'patient' 
  AND role != 'admin';

TRUNCATE TABLE audit_logs CASCADE;
"
echo "✅ Operational DB mock patients purged."

echo ""
echo "===================================================================="
echo " VERIFICATION SUMMARY"
echo "===================================================================="
echo "Active users remaining in Operational DB:"
run_operational_sql "SELECT id, email, role, full_name, status FROM users ORDER BY role, email;"

echo ""
echo "Counts in Patient DB:"
run_patient_sql "
SELECT 'bookings' as tbl, count(*) FROM bookings
UNION ALL SELECT 'consultations', count(*) FROM consultations
UNION ALL SELECT 'prescriptions', count(*) FROM prescriptions
UNION ALL SELECT 'patient_documents', count(*) FROM patient_documents
UNION ALL SELECT 'patient_medical_profiles', count(*) FROM patient_medical_profiles;
"

echo "===================================================================="
echo " Done! System is clean and mock data has been purged."
echo "===================================================================="

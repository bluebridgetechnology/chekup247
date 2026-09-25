# ==============================================================================
# ChekUp247 - Windows PowerShell Mock Data Purge Script
# Cleans all mock patients, mock bookings, consultations, prescriptions,
# medical profiles, and documents while STRICTLY PRESERVING admin users.
#
# Usage:
#   .\scripts\clean-mock-data.ps1
# ==============================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " ChekUp247 - Cleaning Mock Patients and Clinical Data" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

$PatientContainer = "chekup-patient-postgres"
$OperationalContainer = "chekup-operational-postgres"
$DbUser = "chekup_user"
$PatientDb = "chekup_patient"
$OperationalDb = "chekup_operational"

Write-Host "1. Checking Admin accounts in Operational DB (guaranteed preservation)..." -ForegroundColor Yellow
docker exec $OperationalContainer psql -U $DbUser -d $OperationalDb -P pager=off -c "SELECT id, email, role, full_name, status FROM users WHERE role = 'admin';"

Write-Host ""
Write-Host "2. Purging mock patient records from Patient Database ($PatientDb)..." -ForegroundColor Yellow
$patientSql = "TRUNCATE TABLE notifications, patient_documents, patient_medical_profiles, wallet_credits, reviews, disputes, payments, consultation_extensions, prescriptions, consultations, bookings CASCADE;"
docker exec $PatientContainer psql -U $DbUser -d $PatientDb -P pager=off -c "$patientSql"
Write-Host "Patient DB clinical mock records truncated." -ForegroundColor Green

Write-Host ""
Write-Host "3. Removing mock patients and notification preferences from Operational DB ($OperationalDb)..." -ForegroundColor Yellow
$operationalSql = "DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM users WHERE role = 'patient' AND role != 'admin'); DELETE FROM users WHERE role = 'patient' AND role != 'admin'; TRUNCATE TABLE audit_logs CASCADE;"
docker exec $OperationalContainer psql -U $DbUser -d $OperationalDb -P pager=off -c "$operationalSql"
Write-Host "Operational DB mock patients purged." -ForegroundColor Green

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Active users remaining in Operational DB:" -ForegroundColor Yellow
docker exec $OperationalContainer psql -U $DbUser -d $OperationalDb -P pager=off -c "SELECT id, email, role, full_name, status FROM users ORDER BY role, email;"

Write-Host ""
Write-Host "Counts in Patient DB:" -ForegroundColor Yellow
$countSql = "SELECT 'bookings' as tbl, count(*) FROM bookings UNION ALL SELECT 'consultations', count(*) FROM consultations UNION ALL SELECT 'prescriptions', count(*) FROM prescriptions UNION ALL SELECT 'patient_documents', count(*) FROM patient_documents UNION ALL SELECT 'patient_medical_profiles', count(*) FROM patient_medical_profiles;"
docker exec $PatientContainer psql -U $DbUser -d $PatientDb -P pager=off -c "$countSql"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " Done! System is clean and mock data has been purged." -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Cyan

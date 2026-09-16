# ==============================================================================
# ChekUp247 Telehealth Platform — Database Backup Automation PowerShell (OPS-1001)
# ==============================================================================
param(
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$opDbHost = $env:OPERATIONAL_DB_HOST
if (-not $opDbHost) { $opDbHost = "localhost" }
$opDbPort = $env:OPERATIONAL_DB_PORT
if (-not $opDbPort) { $opDbPort = "5432" }
$opDbUser = $env:OPERATIONAL_DB_USER
if (-not $opDbUser) { $opDbUser = "chekup_user" }
$opDbName = $env:OPERATIONAL_DB_NAME
if (-not $opDbName) { $opDbName = "chekup_operational" }
$env:PGPASSWORD = if ($env:OPERATIONAL_DB_PASSWORD) { $env:OPERATIONAL_DB_PASSWORD } else { "chekup_password" }

Write-Host "[$((Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ'))] Starting ChekUp247 Database Backup..."

$opFile = Join-Path $BackupDir "operational_${opDbName}_${timestamp}.sql"
Write-Host "Dumping Operational DB ($opDbName) to $opFile..."
& pg_dump -h $opDbHost -p $opDbPort -U $opDbUser --format=plain --no-owner --no-privileges $opDbName -f $opFile

# Patient DB
$patientDbHost = $env:PATIENT_DB_HOST
if (-not $patientDbHost) { $patientDbHost = "localhost" }
$patientDbPort = $env:PATIENT_DB_PORT
if (-not $patientDbPort) { $patientDbPort = "5433" }
$patientDbUser = $env:PATIENT_DB_USER
if (-not $patientDbUser) { $patientDbUser = "chekup_user" }
$patientDbName = $env:PATIENT_DB_NAME
if (-not $patientDbName) { $patientDbName = "chekup_patient" }
$env:PGPASSWORD = if ($env:PATIENT_DB_PASSWORD) { $env:PATIENT_DB_PASSWORD } else { "chekup_password" }

$patientFile = Join-Path $BackupDir "patient_${patientDbName}_${timestamp}.sql"
Write-Host "Dumping Patient DB ($patientDbName) to $patientFile..."
& pg_dump -h $patientDbHost -p $patientDbPort -U $patientDbUser --format=plain --no-owner --no-privileges $patientDbName -f $patientFile

# Checksums
Get-FileHash -Algorithm SHA256 $opFile | Out-File -FilePath "$opFile.sha256"
Get-FileHash -Algorithm SHA256 $patientFile | Out-File -FilePath "$patientFile.sha256"

Write-Host "Backup completed with SHA-256 integrity hashes."

# Retention cleanup
$limitDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Recurse -File | Where-Object { $_.LastWriteTime -lt $limitDate } | Remove-Item -Force
Write-Host "Pruned backups older than $RetentionDays days."

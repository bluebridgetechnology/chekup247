/** DDL for the EHR tables; used by the migration and by a startup safety net (prod may run neither migrations nor synchronize). */
export const PATIENT_RECORDS_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "patient_vitals" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" uuid NOT NULL,
    "recorded_by" uuid NOT NULL,
    "booking_id" uuid,
    "bp_systolic" smallint,
    "bp_diastolic" smallint,
    "heart_rate" smallint,
    "respiratory_rate" smallint,
    "temperature_c" numeric(4,1),
    "spo2" smallint,
    "weight_kg" numeric(5,1),
    "height_cm" numeric(4,1),
    "glucose_mmol" numeric(4,1),
    "notes" text,
    "recorded_at" timestamptz NOT NULL DEFAULT now(),
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_patient_vitals_patient_recorded" ON "patient_vitals" ("patient_id", "recorded_at")`,
  `CREATE TABLE IF NOT EXISTS "patient_problems" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" uuid NOT NULL,
    "added_by" uuid NOT NULL,
    "icd10_code" varchar(20),
    "description" varchar(255) NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "onset_date" date,
    "resolved_at" timestamptz,
    "notes" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_patient_problems_patient_status" ON "patient_problems" ("patient_id", "status")`,
];

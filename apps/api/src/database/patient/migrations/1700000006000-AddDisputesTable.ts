import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisputesTable1700000006000 implements MigrationInterface {
  name = 'AddDisputesTable1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dispute_status_enum AS ENUM ('open', 'investigating', 'resolved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dispute_raised_by_enum AS ENUM ('patient', 'doctor', 'admin', 'system');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dispute_resolution_type_enum AS ENUM ('refund', 'credit', 'no_action');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "disputes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "raised_by_user_id" uuid,
        "raised_by" dispute_raised_by_enum NOT NULL DEFAULT 'patient',
        "category" varchar(100) NOT NULL,
        "reason" text NOT NULL,
        "status" dispute_status_enum NOT NULL DEFAULT 'open',
        "assigned_admin_id" uuid,
        "evidence_urls" jsonb,
        "resolution_type" dispute_resolution_type_enum,
        "resolution_notes" text,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_disputes_booking" ON "disputes"("booking_id");
      CREATE INDEX IF NOT EXISTS "idx_disputes_status_created" ON "disputes"("status", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "disputes";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_resolution_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_raised_by_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_status_enum";`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutHoldAndApproval1700000007000 implements MigrationInterface {
  name = 'AddPayoutHoldAndApproval1700000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "payout_status_enum" ADD VALUE IF NOT EXISTS 'hold';
    `);

    await queryRunner.query(`
      ALTER TABLE "payouts"
      ADD COLUMN IF NOT EXISTS "hold_reason" text,
      ADD COLUMN IF NOT EXISTS "approved_by_admin_id" uuid,
      ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP WITH TIME ZONE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payouts"
      DROP COLUMN IF EXISTS "hold_reason",
      DROP COLUMN IF EXISTS "approved_by_admin_id",
      DROP COLUMN IF EXISTS "approved_at";
    `);
    // Postgres does not support removing an enum value; the 'hold' label
    // is left in place on down (harmless — simply unused).
  }
}

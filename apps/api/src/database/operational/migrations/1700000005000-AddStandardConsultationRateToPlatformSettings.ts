import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStandardConsultationRateToPlatformSettings1700000005000
  implements MigrationInterface
{
  name = 'AddStandardConsultationRateToPlatformSettings1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "standard_consultation_rate" decimal(10,2) NOT NULL DEFAULT 850.00;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      DROP COLUMN IF EXISTS "standard_consultation_rate";
    `);
  }
}

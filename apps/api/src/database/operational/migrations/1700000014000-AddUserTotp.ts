import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTotp1700000013000 implements MigrationInterface {
  name = 'AddUserTotp1700000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "totp_secret" varchar(64),
      ADD COLUMN IF NOT EXISTS "totp_enabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "totp_enabled_at" TIMESTAMP WITH TIME ZONE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "totp_secret",
      DROP COLUMN IF EXISTS "totp_enabled",
      DROP COLUMN IF EXISTS "totp_enabled_at";
    `);
  }
}

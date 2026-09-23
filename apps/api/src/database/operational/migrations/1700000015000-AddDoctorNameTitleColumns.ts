import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorNameTitleColumns1700000014000 implements MigrationInterface {
  name = 'AddDoctorNameTitleColumns1700000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "title" varchar(20),
      ADD COLUMN IF NOT EXISTS "first_name" varchar(255),
      ADD COLUMN IF NOT EXISTS "last_name" varchar(255),
      ADD COLUMN IF NOT EXISTS "id_number" varchar(30),
      ADD COLUMN IF NOT EXISTS "gender" varchar(10),
      ADD COLUMN IF NOT EXISTS "province" varchar(40),
      ADD COLUMN IF NOT EXISTS "languages_spoken" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "title",
      DROP COLUMN IF EXISTS "first_name",
      DROP COLUMN IF EXISTS "last_name",
      DROP COLUMN IF EXISTS "id_number",
      DROP COLUMN IF EXISTS "gender",
      DROP COLUMN IF EXISTS "province",
      DROP COLUMN IF EXISTS "languages_spoken";
    `);
  }
}

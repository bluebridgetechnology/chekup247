import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTimezone1700000021000 implements MigrationInterface {
  name = 'AddUserTimezone1700000021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" varchar(64);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone";`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminSubRole1700000009000 implements MigrationInterface {
  name = 'AddAdminSubRole1700000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE admin_sub_role_enum AS ENUM ('super_admin', 'support');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "admin_sub_role" admin_sub_role_enum;
    `);

    // Existing admin accounts (including the bootstrap account) default to
    // super_admin so nothing loses access on upgrade.
    await queryRunner.query(`
      UPDATE "users" SET "admin_sub_role" = 'super_admin'
      WHERE "role" = 'admin' AND "admin_sub_role" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "admin_sub_role";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_sub_role_enum";`);
  }
}

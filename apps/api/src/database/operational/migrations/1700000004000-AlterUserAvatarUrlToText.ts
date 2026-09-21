import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterUserAvatarUrlToText1700000004000 implements MigrationInterface {
  name = 'AlterUserAvatarUrlToText1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "avatar_url" TYPE text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "avatar_url" TYPE varchar(500);
    `);
  }
}

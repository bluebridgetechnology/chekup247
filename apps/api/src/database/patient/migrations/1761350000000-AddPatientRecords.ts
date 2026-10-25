import { MigrationInterface, QueryRunner } from 'typeorm';
import { PATIENT_RECORDS_DDL } from '../patient-records.schema';

export class AddPatientRecords1761350000000 implements MigrationInterface {
  name = 'AddPatientRecords1761350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PATIENT_RECORDS_DDL) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_problems"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_vitals"`);
  }
}

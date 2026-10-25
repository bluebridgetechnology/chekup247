import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PatientProblemStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

/** Problem list entry: an ongoing or past diagnosis tracked on the patient's chart. */
@Entity('patient_problems')
@Index(['patient_id', 'status'])
export class PatientProblem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patient_id: string;

  @Column({ type: 'uuid' })
  added_by: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  icd10_code: string | null;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 20, default: PatientProblemStatus.ACTIVE })
  status: PatientProblemStatus;

  @Column({ type: 'date', nullable: true })
  onset_date: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

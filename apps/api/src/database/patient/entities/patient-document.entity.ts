import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PatientDocumentCategory {
  LAB_REPORT = 'lab_report',
  IMAGING = 'imaging',
  BLOOD_TEST = 'blood_test',
  PRESCRIPTION = 'prescription',
  DISCHARGE_SUMMARY = 'discharge_summary',
  OTHER = 'other',
}

@Entity('patient_documents')
@Index(['patient_id', 'created_at'])
export class PatientDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Plain UUID referencing User (patient) */
  @Column({ type: 'uuid' })
  patient_id: string;

  /** Optional link to a specific booking/consultation session */
  @Column({ type: 'uuid', nullable: true })
  booking_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  original_filename: string;

  @Column({
    type: 'enum',
    enum: PatientDocumentCategory,
    default: PatientDocumentCategory.LAB_REPORT,
  })
  category: PatientDocumentCategory;

  @Column({ type: 'varchar', length: 500 })
  s3_key: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  public_url: string | null;

  @Column({ type: 'int', default: 0 })
  file_size: number;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

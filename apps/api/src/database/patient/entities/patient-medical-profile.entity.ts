import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('patient_medical_profiles')
export class PatientMedicalProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Plain UUID referencing User (patient) on Operational DB */
  @Column({ type: 'uuid', unique: true })
  @Index()
  patient_id: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  blood_group: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  genotype: string | null;

  @Column({ type: 'text', nullable: true })
  allergies: string | null;

  @Column({ type: 'text', nullable: true })
  chronic_conditions: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

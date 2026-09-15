import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Consultation } from './consultation.entity';

export interface MedicationItem {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
  nappi_code?: string;
}

@Entity('prescriptions')
@Index(['patient_id', 'created_at'])
@Index(['doctor_id', 'created_at'])
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  consultation_id: string;

  @ManyToOne(() => Consultation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultation_id' })
  consultation: Consultation;

  /** Plain UUID — cross-database reference to DoctorProfile */
  @Column({ type: 'uuid' })
  doctor_id: string;

  @Column({ type: 'uuid' })
  patient_id: string;

  @Column({ type: 'jsonb' })
  medications: MedicationItem[];

  /** Mandatory South African ICD-10 code */
  @Column({ type: 'varchar', length: 20 })
  icd10_code: string;

  /** Schedule flag for controlled substances (S1–S6) */
  @Column({ type: 'varchar', length: 10, nullable: true })
  schedule_flag: string | null;

  /** Mandatory declaration when S5/S6 substance prescribed */
  @Column({ type: 'text', nullable: true })
  supervision_declaration: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdf_url: string | null;

  @Column({ type: 'timestamp with time zone' })
  issued_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

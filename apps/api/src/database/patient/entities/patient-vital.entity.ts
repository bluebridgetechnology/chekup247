import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** One set of measurements recorded by a doctor (during or outside a consultation). */
@Entity('patient_vitals')
@Index(['patient_id', 'recorded_at'])
export class PatientVital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Plain UUID referencing User (patient) on the Operational DB */
  @Column({ type: 'uuid' })
  patient_id: string;

  /** User id of the recording doctor */
  @Column({ type: 'uuid' })
  recorded_by: string;

  @Column({ type: 'uuid', nullable: true })
  booking_id: string | null;

  @Column({ type: 'smallint', nullable: true })
  bp_systolic: number | null;

  @Column({ type: 'smallint', nullable: true })
  bp_diastolic: number | null;

  @Column({ type: 'smallint', nullable: true })
  heart_rate: number | null;

  @Column({ type: 'smallint', nullable: true })
  respiratory_rate: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature_c: number | null;

  @Column({ type: 'smallint', nullable: true })
  spo2: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  weight_kg: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  height_cm: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  glucose_mmol: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  recorded_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}

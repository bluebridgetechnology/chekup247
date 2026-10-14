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
import { DoctorProfile } from './doctor-profile.entity';

@Entity('availability_slots')
@Index(['doctor_id', 'start_time', 'end_time'])
export class AvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  doctor_id: string;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorProfile;

  @Column({ type: 'timestamp with time zone' })
  start_time: Date;

  @Column({ type: 'timestamp with time zone' })
  end_time: Date;

  @Column({ type: 'boolean', default: false })
  is_booked: boolean;

  @Column({ type: 'boolean', default: false })
  is_recurring: boolean;

  @Column({ type: 'varchar', length: 50, default: 'direct' })
  source: 'direct' | 'locumstaff';

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_window_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_locked: boolean;

  /** Anonymous token of the patient currently checking out this time (see booking.constants.ts). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  hold_token: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  hold_expires_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

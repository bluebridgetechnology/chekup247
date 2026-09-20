import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';

@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  booking_id: string;

  @OneToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  video_room_id: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  room_url: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ended_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  doctor_joined_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  patient_joined_at: Date | null;

  @Column({ type: 'text', nullable: true })
  doctor_notes: string | null;

  @Column({ type: 'text', nullable: true })
  patient_notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

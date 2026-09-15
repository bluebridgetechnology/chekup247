import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
}

@Entity('bookings')
@Index(['patient_id', 'created_at'])
@Index(['doctor_id', 'created_at'])
@Index(['slot_id'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patient_id: string;

  /** Plain UUID — DoctorProfile lives on VPS Operational DB */
  @Column({ type: 'uuid' })
  doctor_id: string;

  /** Plain UUID — AvailabilitySlot lives on VPS Operational DB */
  @Column({ type: 'uuid' })
  slot_id: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commission_amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  payment_status: PaymentStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

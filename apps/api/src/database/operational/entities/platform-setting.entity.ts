import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  commission_percent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 850.00 })
  standard_consultation_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 30.0 })
  late_cancellation_deduction_percent: number;

  @Column({ type: 'int', default: 10 })
  no_show_grace_minutes: number;

  @Column({ type: 'int', default: 30 })
  default_slot_duration_minutes: number;

  @Column({ type: 'int', default: 5 })
  default_buffer_minutes: number;

  @Column({ type: 'varchar', length: 10, default: 'test' })
  paystack_mode: 'test' | 'live';

  @Column({ type: 'text', nullable: true })
  paystack_test_secret_key: string | null;

  @Column({ type: 'text', nullable: true })
  paystack_test_public_key: string | null;

  @Column({ type: 'text', nullable: true })
  paystack_live_secret_key: string | null;

  @Column({ type: 'text', nullable: true })
  paystack_live_public_key: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('wallet_credits')
@Index(['patient_id', 'is_redeemed'])
export class WalletCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patient_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'ZAR' })
  currency: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'uuid', nullable: true })
  booking_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_redeemed: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

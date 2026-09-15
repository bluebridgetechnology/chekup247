import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Consultation } from './consultation.entity';

export enum ExtensionStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  DECLINED = 'declined',
  PAID = 'paid',
}

@Entity('consultation_extensions')
export class ConsultationExtension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  consultation_id: string;

  @ManyToOne(() => Consultation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultation_id' })
  consultation: Consultation;

  @Column({ type: 'int' })
  duration_minutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'uuid', nullable: true })
  payment_id: string | null;

  @Column({
    type: 'enum',
    enum: ExtensionStatus,
    default: ExtensionStatus.REQUESTED,
  })
  status: ExtensionStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

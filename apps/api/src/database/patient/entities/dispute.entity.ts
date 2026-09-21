import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DisputeStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum DisputeRaisedBy {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export enum DisputeResolutionType {
  REFUND = 'refund',
  CREDIT = 'credit',
  NO_ACTION = 'no_action',
}

@Entity('disputes')
@Index(['booking_id'])
@Index(['status', 'created_at'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  booking_id: string;

  /** Plain UUID — User (patient or doctor) lives on Operational DB */
  @Column({ type: 'uuid', nullable: true })
  raised_by_user_id: string | null;

  @Column({ type: 'enum', enum: DisputeRaisedBy, default: DisputeRaisedBy.PATIENT })
  raised_by: DisputeRaisedBy;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  /** Plain UUID — admin User lives on Operational DB */
  @Column({ type: 'uuid', nullable: true })
  assigned_admin_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  evidence_urls: string[] | null;

  @Column({ type: 'enum', enum: DisputeResolutionType, nullable: true })
  resolution_type: DisputeResolutionType | null;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationDeliveryStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notifications')
@Index(['recipient_id', 'created_at'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Plain UUID for user recipient */
  @Column({ type: 'uuid' })
  recipient_id: string;

  @Column({ type: 'varchar', length: 50 })
  channel: string;

  @Column({ type: 'varchar', length: 100 })
  template_id: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deep_link: string | null;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  read_at: Date | null;

  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.QUEUED,
  })
  status: NotificationDeliveryStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sent_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

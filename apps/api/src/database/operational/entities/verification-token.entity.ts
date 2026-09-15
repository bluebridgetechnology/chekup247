import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  token_hash: string;

  @Column({
    type: 'enum',
    enum: TokenType,
    default: TokenType.EMAIL_VERIFICATION,
  })
  type: TokenType;

  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  used_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}

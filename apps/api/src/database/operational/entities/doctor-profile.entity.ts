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
import { User } from './user.entity';

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum VerificationSource {
  PLATFORM = 'platform',
  LOCUMSTAFF = 'locumstaff',
}

@Entity('doctor_profiles')
export class DoctorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_doctor_profiles_slug', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  hpcsa_number: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verification_status: VerificationStatus;

  @Column({
    type: 'enum',
    enum: VerificationSource,
    default: VerificationSource.PLATFORM,
  })
  verification_source: VerificationSource;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sso_provider: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sso_external_id: string | null;

  @Column({ type: 'varchar', length: 255, default: 'General Practitioner' })
  specialty: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  rate_per_hour: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  rating_avg: number;

  @Column({ type: 'int', default: 0 })
  reviews_count: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facility_name: string | null;

  @Column({ type: 'text', nullable: true })
  facility_address: string | null;

  @Column({ type: 'text', nullable: true })
  photo_url: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  photo_url_expires_at: Date | null;

  @Column({ type: 'text', array: true, default: '{}' })
  documents_url: string[];

  @Column({
    type: 'text',
    array: true,
    default: '{}',
  })
  consultation_types: string[];

  @Column({ type: 'boolean', default: true })
  offers_video: boolean;

  @Column({ type: 'boolean', default: false })
  offers_audio: boolean;

  @Column({ type: 'boolean', default: false })
  offers_in_clinic: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_medical_aid: boolean;

  @Column({ type: 'int', default: 10 })
  experience_years: number;

  @Column({ type: 'boolean', default: true })
  is_board_certified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, default: 'Board Certified' })
  board_certification_title: string | null;

  @Column({ type: 'boolean', default: false })
  is_on_holiday: boolean;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  presence_status: string;

  @Column({ type: 'text', nullable: true })
  signature_url: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  signature_uploaded_at: Date | null;

  @Column({ type: 'text', array: true, default: '{}' })
  secondary_specialties: string[];

  @Column({ type: 'varchar', length: 150, nullable: true })
  bank_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  account_number: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  branch_code: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  account_type: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  account_holder: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}


import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum AdminSubRole {
  SUPER_ADMIN = 'super_admin',
  SUPPORT = 'support',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PATIENT })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash: string;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'boolean', default: false })
  is_email_verified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  email_verified_at: Date | null;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  /**
   * Only meaningful when role=admin. super_admin can invite/revoke other
   * admins, change platform settings, and hold/release payouts; support
   * has read + case-work access (bookings, disputes, patients) but not
   * those higher-privilege actions. Null on an admin account is treated
   * as super_admin for backward compatibility with accounts created
   * before this column existed (see AdminSubRolesGuard).
   */
  @Column({ type: 'enum', enum: AdminSubRole, nullable: true })
  admin_sub_role: AdminSubRole | null;

  /**
   * When true, the client must force a password change before the account
   * can do anything else. Set on bootstrap-seeded admin accounts (which
   * have no signup path, so this is the only way to rotate a known
   * initial credential) and cleared by AuthService.changePassword.
   */
  @Column({ type: 'boolean', default: false })
  must_change_password: boolean;

  /**
   * 2FA (Sprint E). Currently enforced only for role=admin at login —
   * see AuthService.login. totp_secret is only ever set once
   * totp_enabled_at is null (pending enrollment) or already true
   * (active); it is never returned to the client after enrollment
   * completes.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  totp_secret: string | null;

  @Column({ type: 'boolean', default: false })
  totp_enabled: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  totp_enabled_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

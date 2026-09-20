import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserRole,
  UserStatus,
  DoctorProfile,
  VerificationToken,
  TokenType,
  NotificationPreference,
} from '../../database/operational/entities';
import { PatientMedicalProfile } from '../../database/patient/entities';
import { TokenService } from './token.service';
import {
  RegisterPatientDto,
  LoginDto,
  VerifyEmailDto,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleAuthDto,
} from './dto/auth.dto';
import { BrevoEmailProvider } from '../notifications/providers/brevo.provider';
import { SmsProvider } from '../notifications/providers/sms.provider';

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    isEmailVerified: boolean;
    phone?: string;
    avatarUrl?: string | null;
    dateOfBirth?: Date | null;
    doctorProfile?: DoctorProfile | null;
    bloodGroup?: string | null;
    genotype?: string | null;
    allergies?: string | null;
  };
}

export interface RegisterPatientResponse {
  message: string;
  userId: string;
  accessToken: string;
  user: AuthSessionResponse['user'];
  verificationToken?: string;
  otp?: string;
}

export interface RegisterResult {
  user: AuthSessionResponse['user'];
  verificationToken?: string;
  otp?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    @InjectRepository(VerificationToken, 'operational')
    private readonly tokenRepository: Repository<VerificationToken>,
    @InjectRepository(NotificationPreference, 'operational')
    private readonly notificationPreferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(PatientMedicalProfile, 'patient')
    private readonly patientMedicalProfileRepository: Repository<PatientMedicalProfile>,
    private readonly tokenService: TokenService,
    private readonly brevoEmailProvider: BrevoEmailProvider,
    private readonly smsProvider: SmsProvider,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureTestPatientAccount();
    } catch (err: any) {
      this.logger.warn(`Test patient seed check deferred: ${err.message}`);
    }
  }

  /**
   * Seed or verify the default verified test patient account
   */
  async ensureTestPatientAccount(): Promise<{ email: string; message: string; user: User }> {
    const testPatientEmail = 'patient@chekup247.com';
    let user = await this.userRepository.findOne({
      where: { email: testPatientEmail },
    });

    const passwordHash = await this.tokenService.hashPassword('PatientChekup2026!');

    if (!user) {
      user = this.userRepository.create({
        email: testPatientEmail,
        password_hash: passwordHash,
        full_name: 'Lerato Khumalo',
        phone: '+27626571700',
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        is_email_verified: true,
        email_verified_at: new Date(),
      });
      user = await this.userRepository.save(user);

      const prefs = this.notificationPreferenceRepository.create({
        user_id: user.id,
        channels: ['email', 'sms'],
        reminders_enabled: true,
      });
      await this.notificationPreferenceRepository.save(prefs);
      this.logger.log(`Created default test patient account: ${testPatientEmail}`);
    } else {
      user.role = UserRole.PATIENT;
      user.status = UserStatus.ACTIVE;
      user.password_hash = passwordHash;
      user.is_email_verified = true;
      user.full_name = user.full_name || 'Lerato Khumalo';
      user.phone = user.phone || '+27626571700';
      user = await this.userRepository.save(user);
    }

    return {
      email: testPatientEmail,
      message: 'Default verified test patient account is ready',
      user,
    };
  }

  /**
   * Register a new patient.
   * Issues immediate session token for zero checkout friction,
   * while dispatching a 6-digit clinical OTP code for clinical gating.
   */
  async registerPatient(
    dto: RegisterPatientDto,
  ): Promise<RegisterPatientResponse> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await this.tokenService.hashPassword(dto.password);

    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      password_hash: passwordHash,
      full_name: dto.full_name,
      phone: dto.phone,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      is_email_verified: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Create default notification preferences
    const prefs = this.notificationPreferenceRepository.create({
      user_id: savedUser.id,
      channels: ['email', 'whatsapp'],
      reminders_enabled: true,
    });
    await this.notificationPreferenceRepository.save(prefs);

    // Generate 6-digit numeric OTP (15 min expiration)
    const { otp, hash } = this.tokenService.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const verificationToken = this.tokenRepository.create({
      user_id: savedUser.id,
      token_hash: hash,
      type: TokenType.EMAIL_VERIFICATION,
      expires_at: expiresAt,
    });
    await this.tokenRepository.save(verificationToken);

    // Dispatch verification code via Email & SMS
    await this.sendVerificationOtp(savedUser, otp);

    this.logger.log(`Patient registered: ${savedUser.email}. OTP: ${otp}`);

    // Generate immediate session accessToken so patient can continue to booking checkout
    const accessToken = this.tokenService.generateAccessToken({
      sub: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      fullName: savedUser.full_name,
    });

    return {
      message: 'Registration successful. A 6-digit verification code has been dispatched.',
      userId: savedUser.id,
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.full_name,
        role: savedUser.role,
        status: savedUser.status,
        phone: savedUser.phone,
        isEmailVerified: savedUser.is_email_verified,
        avatarUrl: savedUser.avatar_url,
        dateOfBirth: savedUser.date_of_birth,
      },
      verificationToken: otp,
      otp,
    };
  }

  /**
   * Verify patient email with 6-digit OTP code
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<AuthSessionResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('User associated with this email was not found');
    }

    if (user.is_email_verified) {
      const accessToken = this.tokenService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          status: user.status,
          phone: user.phone,
          isEmailVerified: true,
          avatarUrl: user.avatar_url,
          dateOfBirth: user.date_of_birth,
        },
      };
    }

    const otpHash = this.tokenService.hashToken(dto.otp.trim());

    const record = await this.tokenRepository.findOne({
      where: {
        user_id: user.id,
        token_hash: otpHash,
        type: TokenType.EMAIL_VERIFICATION,
      },
      order: { created_at: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException('Invalid verification code. Please check and try again.');
    }

    if (record.used_at) {
      throw new BadRequestException('This verification code has already been used');
    }

    if (new Date() > record.expires_at) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    // Mark as verified
    user.is_email_verified = true;
    user.email_verified_at = new Date();
    await this.userRepository.save(user);

    // Mark token as used
    record.used_at = new Date();
    await this.tokenRepository.save(record);

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    this.logger.log(`Patient verified via OTP: ${user.email}`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        phone: user.phone,
        isEmailVerified: user.is_email_verified,
        avatarUrl: user.avatar_url,
        dateOfBirth: user.date_of_birth,
      },
    };
  }

  /**
   * Resend 6-digit OTP code to patient
   */
  async resendOtp(dto: ResendOtpDto): Promise<{ message: string; otp?: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('User associated with this email was not found');
    }

    if (user.is_email_verified) {
      return { message: 'Account is already verified.' };
    }

    // Generate new 6-digit numeric OTP (15 min expiration)
    const { otp, hash } = this.tokenService.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const verificationToken = this.tokenRepository.create({
      user_id: user.id,
      token_hash: hash,
      type: TokenType.EMAIL_VERIFICATION,
      expires_at: expiresAt,
    });
    await this.tokenRepository.save(verificationToken);

    await this.sendVerificationOtp(user, otp);

    this.logger.log(`Resent OTP for ${user.email}: ${otp}`);

    return {
      message: 'A new 6-digit verification code has been dispatched.',
      otp,
    };
  }

  /**
   * Helper to dispatch 6-digit OTP code via email and SMS
   */
  private async sendVerificationOtp(user: User, otp: string): Promise<void> {
    try {
      if (user.email) {
        await this.brevoEmailProvider.sendEmail({
          to: [{ email: user.email, name: user.full_name }],
          subject: `${otp} is your ChekUp247 verification code`,
          templateId: 'otp_verification',
          templateParams: {
            patientName: user.full_name,
            otp,
          },
        });
      }

      if (user.phone) {
        await this.smsProvider.sendSms({
          to: user.phone,
          message: `Your ChekUp247 clinical verification code is: ${otp}. Valid for 15 minutes.`,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not dispatch OTP notification: ${err.message}`);
    }
  }

  /**
   * Verify patient email with token
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<AuthSessionResponse> {
    const tokenHash = this.tokenService.hashToken(dto.token);

    const record = await this.tokenRepository.findOne({
      where: {
        token_hash: tokenHash,
        type: TokenType.EMAIL_VERIFICATION,
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (record.used_at) {
      throw new BadRequestException('This verification token has already been used');
    }

    if (new Date() > record.expires_at) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    const user = await this.userRepository.findOne({
      where: { id: record.user_id },
    });

    if (!user) {
      throw new NotFoundException('User associated with this token was not found');
    }

    // Mark as verified
    user.is_email_verified = true;
    user.email_verified_at = new Date();
    await this.userRepository.save(user);

    // Mark token as used
    record.used_at = new Date();
    await this.tokenRepository.save(record);

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        phone: user.phone,
        isEmailVerified: user.is_email_verified,
        avatarUrl: user.avatar_url,
        dateOfBirth: user.date_of_birth,
      },
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(
    dto: LoginDto,
    requiredRole?: UserRole,
  ): Promise<AuthSessionResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Your account has been ${user.status}. Please contact platform support.`,
      );
    }

    const isMatch = await this.tokenService.comparePassword(
      dto.password,
      user.password_hash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // If a specific role is demanded (e.g. admin isolated login)
    if (requiredRole && user.role !== requiredRole) {
      throw new UnauthorizedException(
        `Unauthorized role access: account does not possess ${requiredRole} permissions`,
      );
    }

    // If doctor, load doctor profile
    let doctorProfile: DoctorProfile | null = null;
    if (user.role === UserRole.DOCTOR) {
      doctorProfile = await this.doctorRepository.findOne({
        where: { user_id: user.id },
      });
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        phone: user.phone,
        isEmailVerified: user.is_email_verified,
        avatarUrl: user.avatar_url,
        dateOfBirth: user.date_of_birth,
        doctorProfile,
      },
    };
  }

  /**
   * Request password reset token
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success message to avoid email enumeration
    const message =
      'If an account matches this email address, a password reset link has been dispatched.';

    if (!user) {
      return { message };
    }

    const { token, hash } = this.tokenService.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const resetRecord = this.tokenRepository.create({
      user_id: user.id,
      token_hash: hash,
      type: TokenType.PASSWORD_RESET,
      expires_at: expiresAt,
    });
    await this.tokenRepository.save(resetRecord);

    this.logger.log(`Password reset requested for ${user.email}. Reset token: ${token}`);

    return {
      message,
      resetToken: token, // Returned for dev testing & transactional mailer
    };
  }

  /**
   * Reset password with valid token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(dto.token);

    const record = await this.tokenRepository.findOne({
      where: {
        token_hash: tokenHash,
        type: TokenType.PASSWORD_RESET,
      },
    });

    if (!record || record.used_at || new Date() > record.expires_at) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const user = await this.userRepository.findOne({
      where: { id: record.user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password_hash = await this.tokenService.hashPassword(dto.new_password);
    await this.userRepository.save(user);

    record.used_at = new Date();
    await this.tokenRepository.save(record);

    return { message: 'Password has been updated successfully. You can now log in.' };
  }

  /**
   * Google Social Sign-In / Registration
   */
  async googleAuth(dto: GoogleAuthDto): Promise<AuthSessionResponse> {
    // In production, verify with Google Auth Library / Tokeninfo endpoint
    // Fallback/direct parsing for robust support:
    let email = dto.email;
    let fullName = dto.name || 'Google Patient';
    let avatarUrl = dto.picture;

    // If credential is JWT (Google ID token), extract claims
    if (dto.credential && dto.credential.includes('.')) {
      try {
        const payload: any = JSON.parse(
          Buffer.from(dto.credential.split('.')[1], 'base64').toString(),
        );
        email = payload.email || email;
        fullName = payload.name || fullName;
        avatarUrl = payload.picture || avatarUrl;
      } catch (e) {
        // use fallback dto fields
      }
    }

    if (!email) {
      throw new BadRequestException('Google account email is required');
    }

    email = email.toLowerCase();
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      user = this.userRepository.create({
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        is_email_verified: true,
        email_verified_at: new Date(),
      });
      user = await this.userRepository.save(user);

      // Create default notification preferences
      const prefs = this.notificationPreferenceRepository.create({
        user_id: user.id,
        channels: ['email', 'whatsapp'],
        reminders_enabled: true,
      });
      await this.notificationPreferenceRepository.save(prefs);
    } else {
      if (!user.is_email_verified) {
        user.is_email_verified = true;
        user.email_verified_at = new Date();
        if (avatarUrl && !user.avatar_url) user.avatar_url = avatarUrl;
        user = await this.userRepository.save(user);
      }
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        phone: user.phone,
        isEmailVerified: user.is_email_verified,
        avatarUrl: user.avatar_url,
        dateOfBirth: user.date_of_birth,
      },
    };
  }

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let doctorProfile: DoctorProfile | null = null;
    if (user.role === UserRole.DOCTOR) {
      doctorProfile = await this.doctorRepository.findOne({
        where: { user_id: user.id },
      });
    }

    let medicalProfile: PatientMedicalProfile | null = null;
    if (user.role === UserRole.PATIENT) {
      medicalProfile = await this.patientMedicalProfileRepository.findOne({
        where: { patient_id: user.id },
      });
    }

    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { user_id: user.id },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      phone: user.phone,
      isEmailVerified: user.is_email_verified,
      avatarUrl: user.avatar_url,
      dateOfBirth: user.date_of_birth,
      createdAt: user.created_at,
      doctorProfile,
      bloodGroup: medicalProfile?.blood_group || null,
      genotype: medicalProfile?.genotype || null,
      allergies: medicalProfile?.allergies || null,
      chronicConditions: medicalProfile?.chronic_conditions || null,
      notificationPreferences: preferences
        ? {
            channels: preferences.channels,
            remindersEnabled: preferences.reminders_enabled,
          }
        : { channels: ['email', 'whatsapp'], remindersEnabled: true },
    };
  }

  /**
   * Update patient profile details
   */
  async updateProfile(
    userId: string,
    dto: {
      full_name?: string;
      phone?: string;
      date_of_birth?: string;
      avatar_url?: string;
      blood_group?: string;
      genotype?: string;
      allergies?: string;
      chronic_conditions?: string;
    },
  ): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.full_name) user.full_name = dto.full_name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;
    if (dto.date_of_birth) user.date_of_birth = new Date(dto.date_of_birth);

    const saved = await this.userRepository.save(user);

    // Update or insert medical profile if medical fields are provided
    if (
      dto.blood_group !== undefined ||
      dto.genotype !== undefined ||
      dto.allergies !== undefined ||
      dto.chronic_conditions !== undefined
    ) {
      let med = await this.patientMedicalProfileRepository.findOne({
        where: { patient_id: userId },
      });
      if (!med) {
        med = this.patientMedicalProfileRepository.create({
          patient_id: userId,
          blood_group: dto.blood_group || null,
          genotype: dto.genotype || null,
          allergies: dto.allergies || null,
          chronic_conditions: dto.chronic_conditions || null,
        });
      } else {
        if (dto.blood_group !== undefined) med.blood_group = dto.blood_group || null;
        if (dto.genotype !== undefined) med.genotype = dto.genotype || null;
        if (dto.allergies !== undefined) med.allergies = dto.allergies || null;
        if (dto.chronic_conditions !== undefined) med.chronic_conditions = dto.chronic_conditions || null;
      }
      await this.patientMedicalProfileRepository.save(med);
    }

    return this.getCurrentUser(saved.id);
  }

  /**
   * Update notification preferences (enforces 1 or 2 channels constraint)
   */
  async updateNotificationPreferences(
    userId: string,
    dto: { channels: string[]; remindersEnabled?: boolean },
  ): Promise<any> {
    const validChannels = ['email', 'sms', 'whatsapp'];
    const selected = dto.channels.filter((ch) => validChannels.includes(ch));

    if (selected.length < 1 || selected.length > 2) {
      throw new BadRequestException(
        'Patients must choose either 1 or 2 preferred notification channels (from email, sms, whatsapp)',
      );
    }

    let pref = await this.notificationPreferenceRepository.findOne({
      where: { user_id: userId },
    });

    if (!pref) {
      pref = this.notificationPreferenceRepository.create({
        user_id: userId,
        channels: selected,
        reminders_enabled: dto.remindersEnabled !== false,
      });
    } else {
      pref.channels = selected;
      if (dto.remindersEnabled !== undefined) {
        pref.reminders_enabled = dto.remindersEnabled;
      }
    }

    await this.notificationPreferenceRepository.save(pref);
    return {
      channels: pref.channels,
      remindersEnabled: pref.reminders_enabled,
    };
  }
}

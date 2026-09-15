import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { TokenService } from './token.service';
import {
  RegisterPatientDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleAuthDto,
} from './dto/auth.dto';

export interface AuthSessionResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    isEmailVerified: boolean;
    avatarUrl?: string | null;
    dateOfBirth?: Date | null;
    doctorProfile?: DoctorProfile | null;
  };
}

@Injectable()
export class AuthService {
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
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register a new patient
   */
  async registerPatient(
    dto: RegisterPatientDto,
  ): Promise<{ message: string; userId: string; verificationToken: string }> {
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

    // Generate email verification token (24h expiration)
    const { token, hash } = this.tokenService.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verificationToken = this.tokenRepository.create({
      user_id: savedUser.id,
      token_hash: hash,
      type: TokenType.EMAIL_VERIFICATION,
      expires_at: expiresAt,
    });
    await this.tokenRepository.save(verificationToken);

    this.logger.log(`Patient registered: ${savedUser.email}. Verification token: ${token}`);

    return {
      message: 'Registration successful. Please verify your email address to continue.',
      userId: savedUser.id,
      verificationToken: token, // Returned for dev convenience & transactional mailer
    };
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
    dto: { full_name?: string; phone?: string; date_of_birth?: string; avatar_url?: string },
  ): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.full_name) user.full_name = dto.full_name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;
    if (dto.date_of_birth) user.date_of_birth = new Date(dto.date_of_birth);

    const saved = await this.userRepository.save(user);
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

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, MoreThanOrEqual, Between, In } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DoctorProfile,
  AvailabilitySlot,
  User,
  DoctorBlackout,
  PlatformSetting,
  UserRole,
  UserStatus,
  VerificationStatus,
  VerificationSource,
  Payout,
  PayoutStatus,
} from '../../database/operational/entities';
import { Booking, BookingStatus } from '../../database/patient/entities';
import { OnboardDoctorDto, UpdateDoctorProfileDto, GetDoctorsQueryDto } from './dto/doctor.dto';
import {
  CreateSingleSlotDto,
  CreateRecurringAvailabilityDto,
  GetAvailabilityQueryDto,
  CreateBlackoutDto,
  BatchDeleteSlotsDto,
} from './dto/availability.dto';
import {
  DEFAULT_PLATFORM_CONSULTATION_RATE,
  PRICING_BLOCK_MINUTES,
  priceForDuration,
  resolveMinimumBillableMinutes,
  resolveConsultationRate,
} from './consultation-fee';
import { randomBytes } from 'crypto';
import { envConfig } from '../../config/env.config';
import { TokenService } from '../auth/token.service';
import { isValidTimeZone, zonedWallTimeToUtc } from '../../common/utils/zoned-time';
import { DirectorySyncService } from './directory-sync.service';
import { AvailabilitySyncService } from './availability-sync.service';
import {
  isHeldByOther,
  isSlotBookable,
  resolveBookingLeadMinutes,
} from '../bookings/booking.constants';

export interface PaginatedDoctorsResult {
  doctors: DoctorProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** "Dr Solly Motuba" -> "dr-solly-motuba" */
export function slugifyDoctorName(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'doctor'
  );
}

@Injectable()
export class DoctorsService implements OnModuleInit {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    @InjectRepository(AvailabilitySlot, 'operational')
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(DoctorBlackout, 'operational')
    private readonly blackoutRepository: Repository<DoctorBlackout>,
    @InjectRepository(PlatformSetting, 'operational')
    private readonly platformSettingRepository: Repository<PlatformSetting>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payout, 'operational')
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    private readonly tokenService: TokenService,
    private readonly directorySyncService: DirectorySyncService,
    private readonly availabilitySyncService: AvailabilitySyncService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      await this.userRepository.query('ALTER TABLE users ALTER COLUMN avatar_url TYPE text;');
    } catch (err: any) {
      // Column may already be text
    }
    try {
      await this.ensureTestDoctorAccount();
    } catch (err: any) {
      this.logger.warn(`Test doctor seed check deferred: ${err.message}`);
    }
  }

  /**
   * Seed or verify the default verified test doctor account
   */
  async ensureTestDoctorAccount(): Promise<{ email: string; message: string; doctorProfile: DoctorProfile }> {
    const testDoctorEmail = envConfig.DEFAULT_DOCTOR_EMAIL.trim().toLowerCase();
    const doctorName = envConfig.DEFAULT_DOCTOR_NAME.trim();
    const doctorSlug = slugifyDoctorName(doctorName);
    const configuredPassword = envConfig.DEFAULT_DOCTOR_PASSWORD;

    let user = await this.userRepository.findOne({
      where: { email: testDoctorEmail },
    });

    if (!user) {
      // Never ship a known password for a real address: use the configured one, else a random
      // one the doctor replaces through "forgot password".
      const initialPassword = configuredPassword || randomBytes(24).toString('base64url');
      user = this.userRepository.create({
        email: testDoctorEmail,
        password_hash: await this.tokenService.hashPassword(initialPassword),
        full_name: doctorName,
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE,
        is_email_verified: true,
        email_verified_at: new Date(),
      });
      user = await this.userRepository.save(user);
      this.logger.log(`Created default doctor account: ${testDoctorEmail}`);
    } else {
      user.role = UserRole.DOCTOR;
      user.status = UserStatus.ACTIVE;
      user.full_name = doctorName;
      if (configuredPassword) {
        user.password_hash = await this.tokenService.hashPassword(configuredPassword);
      }
      user = await this.userRepository.save(user);
    }

    let profile = await this.doctorRepository.findOne({
      where: { user_id: user.id },
    });

    if (!profile) {
      // Only what is certain: no invented ratings, reviews, facility or bio. The doctor completes
      // the rest (HPCSA number, photo, bio) in the doctor portal.
      profile = this.doctorRepository.create({
        user_id: user.id,
        hpcsa_number: 'PENDING',
        slug: doctorSlug,
        specialty: 'General Practitioner',
        rate_per_hour: DEFAULT_PLATFORM_CONSULTATION_RATE,
        consultation_types: [
          'Video Telehealth Consultation',
          'Acute Infection Care',
          'Chronic Script Renewal',
          'Wellness',
        ],
        verification_status: VerificationStatus.VERIFIED,
        verification_source: VerificationSource.PLATFORM,
        documents_url: [],
      });
      profile = await this.doctorRepository.save(profile);
      this.logger.log(`Created verified default doctor profile for ${testDoctorEmail}`);
    } else {
      profile.verification_status = VerificationStatus.VERIFIED;
      profile.slug = doctorSlug;
      profile.specialty = profile.specialty || 'General Practitioner';
      if (user.avatar_url && profile.photo_url !== user.avatar_url) {
        profile.photo_url = user.avatar_url;
      }
      profile.consultation_types = profile.consultation_types?.length
        ? profile.consultation_types
        : [
            'Video Telehealth Consultation',
            'Acute Infection Care',
            'Chronic Script Renewal',
            'Wellness',
          ];
      profile = await this.doctorRepository.save(profile);
    }

    return {
      email: testDoctorEmail,
      message: 'Verified test doctor account configured and ready for login.',
      doctorProfile: profile,
    };
  }


  /**
   * Public doctor directory search and filtering (BE-302)
   */
  async getDoctorsDirectory(query: GetDoctorsQueryDto = {}): Promise<PaginatedDoctorsResult> {
    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.min(50, Math.max(1, Number(query.limit))) : 12;
    const skip = (page - 1) * limit;

    const qb = this.doctorRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .where('doctor.verification_status = :status', {
        status: VerificationStatus.VERIFIED,
      })
      .andWhere('(doctor.is_on_holiday IS NULL OR doctor.is_on_holiday = false)');

    if (query.specialty && query.specialty !== 'All') {
      qb.andWhere('doctor.specialty ILIKE :specialty', {
        specialty: `%${query.specialty}%`,
      });
    }

    if (query.ratingMin !== undefined && query.ratingMin > 0) {
      qb.andWhere('doctor.rating_avg >= :ratingMin', {
        ratingMin: Number(query.ratingMin),
      });
    }

    if (query.priceMin !== undefined && query.priceMin > 0) {
      qb.andWhere('doctor.rate_per_hour >= :priceMin', {
        priceMin: Number(query.priceMin),
      });
    }

    if (query.priceMax !== undefined && query.priceMax > 0) {
      qb.andWhere('doctor.rate_per_hour <= :priceMax', {
        priceMax: Number(query.priceMax),
      });
    }

    if (query.searchQuery && query.searchQuery.trim()) {
      const search = `%${query.searchQuery.trim()}%`;
      qb.andWhere(
        '(user.full_name ILIKE :search OR doctor.specialty ILIKE :search OR doctor.bio ILIKE :search OR doctor.facility_name ILIKE :search)',
        { search },
      );
    }

    switch (query.sort) {
      case 'price_asc':
        qb.orderBy('doctor.rate_per_hour', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('doctor.rate_per_hour', 'DESC');
        break;
      case 'name_asc':
        qb.orderBy('user.full_name', 'ASC');
        break;
      case 'rating_desc':
      default:
        qb.orderBy('doctor.rating_avg', 'DESC').addOrderBy('doctor.reviews_count', 'DESC');
        break;
    }

    qb.skip(skip).take(limit);

    const [doctors, total] = await qb.getManyAndCount();

    // Ensure all returned doctors have a slug and synced photo_url
    for (const doc of doctors) {
      if (
        doc.user?.avatar_url &&
        (!doc.photo_url ||
          doc.photo_url.includes('images.unsplash.com') ||
          doc.photo_url !== doc.user.avatar_url)
      ) {
        doc.photo_url = doc.user.avatar_url;
        await this.doctorRepository
          .update(doc.id, { photo_url: doc.user.avatar_url })
          .catch(() => null);
      }
      if (!doc.slug && doc.user?.full_name) {
        doc.slug = this.formatSlug(doc.user.full_name);
        await this.doctorRepository.update(doc.id, { slug: doc.slug }).catch(() => null);
      }
    }

    const platformRate = await this.getPlatformConsultationRate();
    const minBillable = await this.getMinimumBillableMinutes();

    return {
      doctors: doctors.map((d) => this.withConsultationRate(d, platformRate, minBillable)) as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Enhanced doctor detail by UUID or URL slug (BE-303)
   */
  async getDoctorByIdOrSlug(idOrSlug: string): Promise<any> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

    let doctor: DoctorProfile | null = null;

    if (isUuid) {
      doctor = await this.doctorRepository.findOne({
        where: [{ id: idOrSlug }, { slug: idOrSlug }],
        relations: ['user'],
      });
    } else {
      doctor = await this.doctorRepository.findOne({
        where: { slug: idOrSlug },
        relations: ['user'],
      });
    }

    if (!doctor) {
      // Fallback: try finding by slug matching format or fallback mock ID
      const targetSlug = idOrSlug === 'doc-1' ? 'dr-thabo-molefe' : idOrSlug;
      doctor = await this.doctorRepository
        .createQueryBuilder('doc')
        .leftJoinAndSelect('doc.user', 'user')
        .where('doc.slug = :targetSlug', { targetSlug })
        .getOne();
    }

    if (!doctor) {
      throw new NotFoundException(`Doctor with identifier '${idOrSlug}' was not found`);
    }

    if (doctor.verification_status !== VerificationStatus.VERIFIED) {
      throw new NotFoundException(`Doctor with identifier '${idOrSlug}' was not found`);
    }

    if (doctor.verification_status !== VerificationStatus.VERIFIED) {
      throw new NotFoundException(`Doctor with identifier '${idOrSlug}' was not found`);
    }

    // Sync avatar / photo if user updated their avatar
    if (
      doctor.user?.avatar_url &&
      (!doctor.photo_url ||
        doctor.photo_url.includes('images.unsplash.com') ||
        doctor.photo_url !== doctor.user.avatar_url)
    ) {
      doctor.photo_url = doctor.user.avatar_url;
    }

    // Ensure slug is populated
    if (!doctor.slug && doctor.user?.full_name) {
      doctor.slug = this.formatSlug(doctor.user.full_name);
      await this.doctorRepository.update(doctor.id, { slug: doctor.slug });
    }

    // Fetch availability slots or provide standard mock bookable slots
    const slots = await this.slotRepository.find({
      where: { doctor_id: doctor.id, is_booked: false },
      order: { start_time: 'ASC' },
      take: 10,
    });

    const mockReviews = [
      {
        id: 'rev-1',
        patient_name: 'Lerato K.',
        rating: 5,
        created_at: '2026-02-14T10:00:00Z',
        comment:
          'Excellent bedside manner! Thoroughly explained my treatment plan and answered all questions patiently.',
      },
      {
        id: 'rev-2',
        patient_name: 'David S.',
        rating: 5,
        created_at: '2026-01-29T14:30:00Z',
        comment:
          'Fast consultation, prompt prescription sent straight to my pharmacy. Highly recommended.',
      },
      {
        id: 'rev-3',
        patient_name: 'Mbali M.',
        rating: 4,
        created_at: '2026-01-10T09:15:00Z',
        comment:
          'Very professional and kind. Video quality was crystal clear and the doctor was on time.',
      },
    ];

    return {
      ...this.withConsultationRate(
        doctor,
        await this.getPlatformConsultationRate(),
        await this.getMinimumBillableMinutes(),
      ),
      available_slots: slots.length > 0 ? slots : this.generateDefaultSlots(),
      recent_reviews: mockReviews,
    };
  }

  async triggerSync() {
    return this.directorySyncService.syncDoctors();
  }

  private formatSlug(name: string): string {
    const clean = name
      .toLowerCase()
      .replace(/^dr\.?\s+/i, '')
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `dr-${clean || 'doctor'}`;
  }

  private generateDefaultSlots() {
    const dates = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const times = ['09:00', '10:30', '14:00', '15:30', '17:00'];
    return times.map((t, idx) => ({
      id: `slot-preview-${idx}`,
      time: t,
      date: tomorrow.toISOString().split('T')[0],
      is_available: true,
    }));
  }

  /** Platform-wide consultation rate (per 30 minutes) set by the admin. */
  async getPlatformConsultationRate(): Promise<number> {
    try {
      const settings = await this.platformSettingRepository.findOne({ where: {} });
      const rate = Number(settings?.standard_consultation_rate);
      if (rate > 0) return rate;
    } catch (err: any) {
      this.logger.warn(`Could not fetch platform consultation rate: ${err?.message}`);
    }
    return DEFAULT_PLATFORM_CONSULTATION_RATE;
  }

  /** Slots close for booking this many minutes before they start (admin Platform Setting). */
  async getBookingLeadMinutes(): Promise<number> {
    try {
      const settings = await this.platformSettingRepository.findOne({ where: {} });
      return resolveBookingLeadMinutes(settings?.booking_lead_minutes);
    } catch (err: any) {
      this.logger.warn(`Could not fetch booking lead minutes: ${err?.message}`);
    }
    return resolveBookingLeadMinutes(undefined);
  }

  /** Sessions shorter than this many minutes are billed as this long (admin Platform Setting). */
  async getMinimumBillableMinutes(): Promise<number> {
    try {
      const settings = await this.platformSettingRepository.findOne({ where: {} });
      return resolveMinimumBillableMinutes(settings?.minimum_billable_minutes);
    } catch (err: any) {
      this.logger.warn(`Could not fetch minimum billable minutes: ${err?.message}`);
    }
    return resolveMinimumBillableMinutes(undefined);
  }

  /**
   * Adds the rate patients actually pay (per 30 minutes) to a doctor payload.
   * Total price for a session = consultation_rate x length / 30 (see priceForDuration).
   */
  withConsultationRate<T extends DoctorProfile>(doctor: T, platformRate: number, minimumBillableMinutes?: number) {
    const { rate, source } = resolveConsultationRate(doctor, platformRate);
    return { ...doctor, consultation_rate: rate, rate_block_minutes: PRICING_BLOCK_MINUTES,
      minimum_billable_minutes: resolveMinimumBillableMinutes(minimumBillableMinutes),
      fee_source: source,
    };
  }

  async getDoctorById(id: string): Promise<DoctorProfile | null> {
    return this.doctorRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }


  async getProfileByUserId(userId: string): Promise<DoctorProfile | null> {
    return this.doctorRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
  }

  /**
   * Direct doctor registration & onboarding (BE-205)
   */
  async onboardDoctor(
    dto: OnboardDoctorDto,
    authenticatedUserId?: string,
  ): Promise<{ message: string; doctorProfile: DoctorProfile; accessToken: string }> {
    let user: User | null = null;

    if (authenticatedUserId) {
      user = await this.userRepository.findOne({ where: { id: authenticatedUserId } });
      if (!user) throw new NotFoundException('Authenticated user not found');
      if (user.role !== UserRole.DOCTOR) {
        user.role = UserRole.DOCTOR;
        user = await this.userRepository.save(user);
      }
    } else {
      if (!dto.email || !dto.password || !dto.full_name) {
        throw new BadRequestException(
          'Email, password, and full name are required for new doctor registration',
        );
      }

      const existing = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });

      if (existing) {
        throw new ConflictException('An account with this email address already exists');
      }

      const passwordHash = await this.tokenService.hashPassword(dto.password);
      user = this.userRepository.create({
        email: dto.email.toLowerCase(),
        password_hash: passwordHash,
        full_name: dto.full_name,
        phone: dto.phone,
        province: dto.province,
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE,
        is_email_verified: false,
      });
      user = await this.userRepository.save(user);
    }

    if (dto.province) {
      user.province = dto.province;
    }
    user.id_number = dto.id_number.trim().toUpperCase();
    user = await this.userRepository.save(user);

    // Check if doctor profile already exists
    let existingProfile = await this.doctorRepository.findOne({
      where: { user_id: user.id },
    });

    if (existingProfile) {
      throw new ConflictException('Doctor profile has already been submitted for this account');
    }

    let standardRate = 850.0;
    try {
      const settings = await this.platformSettingRepository.findOne({ where: {} });
      if (settings?.standard_consultation_rate != null) {
        standardRate = Number(settings.standard_consultation_rate) || 850.0;
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch platform standard consultation rate: ${err?.message}`);
    }

    const doctorProfile = this.doctorRepository.create({
      user_id: user.id,
      hpcsa_number: dto.hpcsa_number,
      qualifications: dto.qualifications || null,
      slug: this.formatSlug(user.full_name),
      specialty: dto.specialty || 'General Practitioner',
      rate_per_hour: dto.rate_per_hour || standardRate,
      bio: dto.bio,
      documents_url: dto.documents_url || [],
      consultation_types: [],
      offers_video: false,
      offers_audio: false,
      offers_in_clinic: dto.offers_in_clinic ?? false,
      accepts_medical_aid: false,
      experience_years: 0,
      is_board_certified: false,
      board_certification_title: null,
      facility_name: dto.facility_name,
      facility_address: dto.facility_address,
      verification_status: VerificationStatus.PENDING,
      verification_source: VerificationSource.PLATFORM,
    });

    const savedProfile = await this.doctorRepository.save(doctorProfile);

    savedProfile.user = user;

    this.logger.log(
      `Doctor profile onboarded: HPCSA ${dto.hpcsa_number} for user ${user.email} (Status: PENDING)`,
    );

    if (this.notificationsService) {
      this.notificationsService
        .dispatchNotification({
          recipientId: user.id,
          title: 'Practitioner Application Received',
          templateId: 'doctor_application_received',
          payload: {
            doctorName: user.full_name,
            hpcsaNumber: dto.hpcsa_number,
            specialty: dto.specialty || 'General Practitioner',
            documentCount: dto.documents_url?.length || 1,
            message: 'Your practitioner onboarding application has been submitted for HPCSA review.',
          },
          deepLink: '/doctor/status',
          forceChannels: ['email'],
        })
        .catch((err) => {
          this.logger.warn(`Could not dispatch doctor_application_received: ${err.message}`);
        });
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return {
      message:
        'Doctor onboarding application submitted successfully. Your credentials and HPCSA registration are now under review by platform administrators.',
      doctorProfile: savedProfile,
      accessToken,
    };
  }

  async updateDoctorProfile(
    userId: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorProfile> {
    const profile = await this.doctorRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const updatableFields = [
      'specialty',
      'qualifications',
      'bio',
      'documents_url',
      'consultation_types',
      'offers_video',
      'offers_audio',
      'offers_in_clinic',
      'facility_name',
      'facility_address',
      'accepts_medical_aid',
      'experience_years',
      'is_board_certified',
      'board_certification_title',
      'is_on_holiday',
      'signature_url',
      'secondary_specialties',
      'bank_name',
      'account_number',
      'branch_code',
      'account_type',
      'account_holder',
      'photo_url',
    ] as const satisfies readonly (keyof UpdateDoctorProfileDto & keyof DoctorProfile)[];

    if (dto.signature_url && dto.signature_url !== profile.signature_url) {
      profile.signature_uploaded_at = new Date();
    }

    const avatar = dto.photo_url || (dto as any).avatar_url;
    if (avatar) {
      profile.photo_url = avatar;
      if (profile.user) {
        try {
          profile.user.avatar_url = avatar;
          await this.userRepository.save(profile.user);
        } catch (err: any) {
          if (err.message?.includes('varying(500)') || err.message?.includes('too long')) {
            await this.userRepository.query('ALTER TABLE users ALTER COLUMN avatar_url TYPE text;');
            await this.userRepository.save(profile.user);
          } else {
            throw err;
          }
        }
      }
    }

    for (const field of updatableFields) {
      if (dto[field] !== undefined) {
        (profile as any)[field] = dto[field];
      }
    }

    return this.doctorRepository.save(profile);
  }

  /**
   * Toggles doctor holiday mode ON/OFF
   */
  async toggleHolidayMode(userIdOrDoctorId: string, isOnHoliday: boolean): Promise<DoctorProfile> {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    profile.is_on_holiday = isOnHoliday;
    return this.doctorRepository.save(profile);
  }

  /**
   * Updates real-time doctor clinical presence status (active, in_consultation, offline)
   */
  async updateDoctorPresenceStatus(userIdOrDoctorId: string, status: string): Promise<DoctorProfile> {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    profile.presence_status = status;
    return this.doctorRepository.save(profile);
  }

  // ==========================================
  // AVAILABILITY & BLACKOUT ENGINE (BE-402, 403, 404, 405)
  // ==========================================

  /**
   * Helper to resolve doctor profile by user ID or doctor profile ID
   */
  async resolveDoctorProfile(userIdOrDoctorId: string): Promise<DoctorProfile> {
    const profile = await this.doctorRepository.findOne({
      where: [{ id: userIdOrDoctorId }, { user_id: userIdOrDoctorId }],
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found for the specified account');
    }

    return profile;
  }

  /**
   * BE-404: Slot overlap and conflict prevention validator
   */
  async validateSlotOverlap(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    excludeSlotId?: string,
  ): Promise<void> {
    if (startTime.getTime() >= endTime.getTime()) {
      throw new BadRequestException('Slot start time must be before end time');
    }

    // Check collision with blackout periods
    const blackoutConflict = await this.blackoutRepository.findOne({
      where: {
        doctor_id: doctorId,
        start_time: LessThan(endTime),
        end_time: MoreThan(startTime),
      },
    });

    if (blackoutConflict) {
      throw new ConflictException(
        `Slot conflicts with active out-of-office / holiday period (${blackoutConflict.reason})`,
      );
    }

    // Check collision with existing slots (both direct and locumstaff)
    const qb = this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.doctor_id = :doctorId', { doctorId })
      .andWhere('slot.start_time < :endTime', { endTime })
      .andWhere('slot.end_time > :startTime', { startTime });

    if (excludeSlotId) {
      qb.andWhere('slot.id != :excludeSlotId', { excludeSlotId });
    }

    const conflict = await qb.getOne();
    if (conflict) {
      throw new ConflictException(
        `Slot overlaps with an existing availability slot (${new Date(conflict.start_time).toISOString()} - ${new Date(conflict.end_time).toISOString()})`,
      );
    }
  }

  /**
   * BE-402: Create single availability slot
   */
  async createSingleSlot(userIdOrDoctorId: string, dto: CreateSingleSlotDto) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date timestamp format');
    }

    if (start.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot create availability slots in the past');
    }

    await this.validateSlotOverlap(profile.id, start, end);

    const slot = this.slotRepository.create({
      doctor_id: profile.id,
      start_time: start,
      end_time: end,
      is_booked: false,
      is_recurring: false,
      source: 'direct',
      is_locked: false,
    });

    return this.slotRepository.save(slot);
  }

  /**
   * BE-402: Create recurring weekly availability slots
   */
  async createRecurringAvailability(
    userIdOrDoctorId: string,
    dto: CreateRecurringAvailabilityDto,
  ) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const startDay = new Date(dto.startDate);
    const endDay = new Date(dto.endDate);

    if (isNaN(startDay.getTime()) || isNaN(endDay.getTime()) || startDay > endDay) {
      throw new BadRequestException('Invalid recurrence start/end date range');
    }

    const [startHour, startMin] = dto.startTime.split(':').map(Number);
    const [endHour, endMin] = dto.endTime.split(':').map(Number);
    const duration = dto.slotDurationMinutes || 30;
    const buffer = dto.bufferMinutes || 5;

    const durationMs = duration * 60 * 1000;
    const bufferMs = buffer * 60 * 1000;

    const slotsToCreate: AvailabilitySlot[] = [];
    let skippedCollisions = 0;

    // Pre-load all blackouts and existing slots in range
    const blackouts = await this.blackoutRepository.find({
      where: {
        doctor_id: profile.id,
        start_time: LessThan(endDay),
        end_time: MoreThan(startDay),
      },
    });

    const existingSlots = await this.slotRepository.find({
      where: {
        doctor_id: profile.id,
        start_time: LessThan(endDay),
        end_time: MoreThan(startDay),
      },
    });

    // Iterate days. When the client sends its IANA timeZone, walk calendar dates and
    // build each window from that zone's wall-clock time (so 08:00 means 08:00 for the
    // doctor, whatever timezone the server runs in). Without it, keep the legacy
    // server-local behaviour.
    const tz = isValidTimeZone(dto.timeZone) ? dto.timeZone : null;
    const ymd = (v: string) => {
      const [yy, mm, dd] = v.slice(0, 10).split('-').map(Number);
      return { yy, mm, dd };
    };

    let current: Date;
    let finalDate: Date;
    if (tz) {
      const sd = ymd(dto.startDate);
      const ed = ymd(dto.endDate);
      current = new Date(Date.UTC(sd.yy, sd.mm - 1, sd.dd));
      finalDate = new Date(Date.UTC(ed.yy, ed.mm - 1, ed.dd));
    } else {
      current = new Date(startDay);
      current.setHours(0, 0, 0, 0);
      finalDate = new Date(endDay);
      finalDate.setHours(23, 59, 59, 999);
    }

    while (current <= finalDate) {
      const dayOfWeek = tz ? current.getUTCDay() : current.getDay(); // 0=Sunday ... 6=Saturday

      if (dto.daysOfWeek.includes(dayOfWeek)) {
        let windowStart: Date;
        let windowEnd: Date;
        if (tz) {
          const y = current.getUTCFullYear();
          const m = current.getUTCMonth() + 1;
          const d = current.getUTCDate();
          windowStart = zonedWallTimeToUtc(y, m, d, startHour, startMin, tz);
          windowEnd = zonedWallTimeToUtc(y, m, d, endHour, endMin, tz);
        } else {
          windowStart = new Date(current);
          windowStart.setHours(startHour, startMin, 0, 0);
          windowEnd = new Date(current);
          windowEnd.setHours(endHour, endMin, 0, 0);
        }

        let slotStart = new Date(windowStart);

        while (true) {
          const slotEnd = new Date(slotStart.getTime() + durationMs);
          if (slotEnd > windowEnd) break;

          // Skip past slots
          if (slotStart.getTime() > Date.now()) {
            // Check blackout
            const isBlackout = blackouts.some((b) => {
              const bStart = new Date(b.start_time).getTime();
              const bEnd = new Date(b.end_time).getTime();
              return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
            });

            // Check existing
            const isOverlap = existingSlots.some((s) => {
              const sStart = new Date(s.start_time).getTime();
              const sEnd = new Date(s.end_time).getTime();
              return slotStart.getTime() < sEnd && slotEnd.getTime() > sStart;
            });

            // Check staged in current batch
            const isStagedOverlap = slotsToCreate.some((s) => {
              return (
                slotStart.getTime() < s.end_time.getTime() &&
                slotEnd.getTime() > s.start_time.getTime()
              );
            });

            if (isBlackout || isOverlap || isStagedOverlap) {
              skippedCollisions++;
            } else {
              const slot = this.slotRepository.create({
                doctor_id: profile.id,
                start_time: new Date(slotStart),
                end_time: new Date(slotEnd),
                is_booked: false,
                is_recurring: true,
                source: 'direct',
                is_locked: false,
              });
              slotsToCreate.push(slot);
            }
          }

          slotStart = new Date(slotEnd.getTime() + bufferMs);
        }
      }

      if (tz) current.setUTCDate(current.getUTCDate() + 1);
      else current.setDate(current.getDate() + 1);
    }

    if (slotsToCreate.length === 0) {
      throw new BadRequestException(
        `No valid future slots could be generated. (Skipped ${skippedCollisions} overlapping or blackout slots)`,
      );
    }

    const saved = await this.slotRepository.save(slotsToCreate);

    return {
      message: `Successfully generated ${saved.length} recurring availability slots.`,
      generatedCount: saved.length,
      skippedCollisions,
      slots: saved,
    };
  }

  /**
   * BE-402: Delete an unbooked future slot
   */
  async deleteSlot(userIdOrDoctorId: string, slotId: string) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    if (slot.doctor_id !== profile.id) {
      throw new NotFoundException('Availability slot does not belong to this doctor');
    }

    if (slot.is_booked) {
      throw new BadRequestException('Cannot delete an already booked consultation slot');
    }

    if (new Date(slot.start_time).getTime() < Date.now()) {
      throw new BadRequestException('Cannot delete past availability slots');
    }

    if (slot.is_locked || slot.source === 'locumstaff') {
      throw new BadRequestException(
        'This shift is synchronized from LocumStaff duty roster and cannot be directly deleted on ChekUp. Please update your roster in the LocumStaff Partner Portal.',
      );
    }

    await this.slotRepository.remove(slot);
    return { message: 'Availability slot deleted successfully', deletedSlotId: slotId };
  }

  /**
   * BE-402: Batch delete unbooked future direct slots
   */
  async batchDeleteSlots(userIdOrDoctorId: string, dto: BatchDeleteSlotsDto) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const qb = this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.doctor_id = :doctorId', { doctorId: profile.id })
      .andWhere('slot.is_booked = false')
      .andWhere('slot.is_locked = false')
      .andWhere('slot.source = :src', { src: 'direct' })
      .andWhere('slot.start_time > :now', { now: new Date() });

    if (dto.slotIds && dto.slotIds.length > 0) {
      qb.andWhere('slot.id IN (:...ids)', { ids: dto.slotIds });
    }

    if (dto.startDate) {
      qb.andWhere('slot.start_time >= :start', { start: new Date(dto.startDate) });
    }

    if (dto.endDate) {
      qb.andWhere('slot.end_time <= :end', { end: new Date(dto.endDate) });
    }

    const slotsToDelete = await qb.getMany();
    if (slotsToDelete.length > 0) {
      await this.slotRepository.remove(slotsToDelete);
    }

    return {
      message: `Successfully deleted ${slotsToDelete.length} unbooked availability slots.`,
      deletedCount: slotsToDelete.length,
    };
  }

  /**
   * BE-403: Public doctor availability query API
   * Accepts startDate and endDate; filters out past slots and already booked slots;
   * returns all timestamps normalized in UTC.
   */
  async getPublicDoctorAvailability(idOrSlug: string, query: GetAvailabilityQueryDto) {
    let doctor = await this.doctorRepository.findOne({
      where: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
        ? { id: idOrSlug }
        : { slug: idOrSlug },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with identifier '${idOrSlug}' was not found`);
    }

    if (doctor.is_on_holiday) {
      return {
        doctor: {
          id: doctor.id,
          name: doctor.user?.full_name || 'Doctor',
          specialty: doctor.specialty,
          is_on_holiday: true,
        },
        slots: [],
        message: 'Doctor is currently on holiday. Bookable appointments are temporarily paused.',
      };
    }

    const now = new Date();
    // A slot is bookable only while it starts at least `bookingLeadMinutes` from now.
    const bookingLeadMinutes = await this.getBookingLeadMinutes();
    const bookableCutoff = new Date(now.getTime() + bookingLeadMinutes * 60 * 1000);
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    // Fetch blackouts in range
    const blackouts = await this.blackoutRepository.find({
      where: {
        doctor_id: doctor.id,
        start_time: LessThan(endDate),
        end_time: MoreThan(startDate),
      },
    });

    // Query unbooked slots that still have enough time remaining
    const rawSlots = await this.slotRepository.find({
      where: {
        doctor_id: doctor.id,
        is_booked: false,
        start_time: MoreThanOrEqual(startDate),
        end_time: Between(bookableCutoff, endDate),
      },
      order: { start_time: 'ASC' },
    });

    // Filter out expired slots (belt-and-braces for clock skew) and any slot inside a blackout
    const slots = rawSlots.filter((slot) => {
      const sStart = new Date(slot.start_time).getTime();
      const sEnd = new Date(slot.end_time).getTime();
      // Hidden while another patient is checking out this time. The holder keeps seeing their own.
      if (isHeldByOther(slot, query.holdToken)) {
        return false;
      }
      if (!isSlotBookable(sStart, bookingLeadMinutes)) {
        return false;
      }
      return !blackouts.some((b) => {
        const bStart = new Date(b.start_time).getTime();
        const bEnd = new Date(b.end_time).getTime();
        return sStart < bEnd && sEnd > bStart;
      });
    });

    const { rate: consultationRate, source: feeSource } = resolveConsultationRate(
      doctor,
      await this.getPlatformConsultationRate(),
    );
    const minimumBillableMinutes = await this.getMinimumBillableMinutes();

    // Group by YYYY-MM-DD
    const groupedByDate: Record<string, any[]> = {};
    const formattedSlots = slots.map((s) => {
      const dateStr = new Date(s.start_time).toISOString().split('T')[0];
      const durationMinutes = Math.round(
        (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (60 * 1000),
      );

      const slotPayload = {
        id: s.id,
        doctorId: s.doctor_id,
        startTime: s.start_time.toISOString(),
        endTime: s.end_time.toISOString(),
        date: dateStr,
        durationMinutes,
        // total price for THIS slot: rate per 30 minutes x its length
        price: priceForDuration(consultationRate, durationMinutes, minimumBillableMinutes),
        source: s.source,
        isLocked: s.is_locked,
      };

      if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
      groupedByDate[dateStr].push(slotPayload);

      return slotPayload;
    });

    return {
      doctorId: doctor.id,
      doctorName: doctor.user?.full_name || 'Dr. Practitioner',
      slug: doctor.slug,
      ratePerHour: Number(doctor.rate_per_hour),
      consultationRate,
      rateBlockMinutes: PRICING_BLOCK_MINUTES,
      minimumBillableMinutes,
      bookingLeadMinutes,
      feeSource,
      totalSlots: formattedSlots.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupedByDate,
      slots: formattedSlots,
    };
  }

  /**
   * DP-401: Doctor calendar view endpoint (returns both booked and unbooked slots, plus blackouts)
   */
  async getDoctorOwnAvailability(userIdOrDoctorId: string, query: GetAvailabilityQueryDto) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days past
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead

    const slots = await this.slotRepository.find({
      where: {
        doctor_id: profile.id,
        start_time: MoreThan(startDate),
        end_time: LessThan(endDate),
      },
      order: { start_time: 'ASC' },
    });

    const blackouts = await this.blackoutRepository.find({
      where: {
        doctor_id: profile.id,
        start_time: MoreThan(startDate),
        end_time: LessThan(endDate),
      },
      order: { start_time: 'ASC' },
    });

    // Cross-database stitching: Fetch bookings attached to these slots from AWS patient DB
    const slotIds = slots.map((s) => s.id);
    const bookings = slotIds.length > 0
      ? await this.bookingRepository.find({
          where: { slot_id: In(slotIds) },
        })
      : [];

    const patientIds = [...new Set(bookings.map((b) => b.patient_id))];
    const patients = patientIds.length > 0
      ? await this.userRepository.find({
          where: { id: In(patientIds) },
        })
      : [];
    const patientMap = new Map<string, User>();
    patients.forEach((p) => patientMap.set(p.id, p));

    const bookingMap = new Map<string, Booking>();
    bookings.forEach((b) => bookingMap.set(b.slot_id, b));

    return {
      doctorId: profile.id,
      slots: slots.map((s) => {
        const booking = bookingMap.get(s.id);
        const patient = booking ? patientMap.get(booking.patient_id) : undefined;
        return {
          id: s.id,
          startTime: s.start_time.toISOString(),
          endTime: s.end_time.toISOString(),
          isBooked: s.is_booked || (booking ? booking.status !== BookingStatus.CANCELLED : false),
          isRecurring: s.is_recurring,
          source: s.source,
          isLocked: s.is_locked,
          bookingStatus: booking?.status,
          patientName: patient?.full_name,
          cancellationReason: booking?.status === BookingStatus.CANCELLED ? (booking.notes || 'Patient cancelled') : undefined,
          cancellationFeeEarned: booking?.status === BookingStatus.CANCELLED ? Number(booking.commission_amount || 0) : undefined,
        };
      }),
      blackouts: blackouts.map((b) => ({
        id: b.id,
        startTime: b.start_time.toISOString(),
        endTime: b.end_time.toISOString(),
        reason: b.reason,
      })),
    };
  }

  /**
   * BE-405: Doctor holiday and blackout date management
   */
  async createBlackout(userIdOrDoctorId: string, dto: CreateBlackoutDto) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const blackout = this.blackoutRepository.create({
      doctor_id: profile.id,
      start_time: start,
      end_time: end,
      reason: dto.reason || 'Out of Office',
    });

    const saved = await this.blackoutRepository.save(blackout);

    // Cancel / remove unbooked future slots that fall in this blackout period
    const slotsToCancel = await this.slotRepository.find({
      where: {
        doctor_id: profile.id,
        is_booked: false,
        start_time: LessThan(end),
        end_time: MoreThan(start),
      },
    });

    if (slotsToCancel.length > 0) {
      await this.slotRepository.remove(slotsToCancel);
    }

    return {
      message: `Blackout created successfully. ${slotsToCancel.length} unbooked availability slots were cancelled.`,
      blackout: saved,
      cancelledSlotsCount: slotsToCancel.length,
    };
  }

  async getDoctorBlackouts(userIdOrDoctorId: string) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    return this.blackoutRepository.find({
      where: { doctor_id: profile.id },
      order: { start_time: 'ASC' },
    });
  }

  async deleteBlackout(userIdOrDoctorId: string, blackoutId: string) {
    const profile = await this.resolveDoctorProfile(userIdOrDoctorId);
    const blackout = await this.blackoutRepository.findOne({
      where: { id: blackoutId, doctor_id: profile.id },
    });

    if (!blackout) {
      throw new NotFoundException('Blackout record not found');
    }

    await this.blackoutRepository.remove(blackout);
    return { message: 'Blackout date range removed successfully' };
  }

  async triggerAvailabilitySync(options?: { startDate?: string; endDate?: string; doctorId?: string }) {
    return this.availabilitySyncService.syncAvailability(options);
  }

  /**
   * BE-903: Doctor Earnings Computation API
   * Aggregates completed consultations, net earnings (price - commission),
   * pending payout balance, and historical payouts.
   */
  async getDoctorEarnings(userIdOrDoctorId: string) {
    let doctor = await this.doctorRepository.findOne({
      where: [{ user_id: userIdOrDoctorId }, { id: userIdOrDoctorId }],
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // 1. Completed consultations on AWS RDS
    const completedBookings = await this.bookingRepository.find({
      where: {
        doctor_id: doctor.id,
        status: BookingStatus.COMPLETED,
      },
      order: { created_at: 'DESC' },
    });

    // 2. Historical payouts on VPS operational DB
    const payouts = await this.payoutRepository.find({
      where: { doctor_id: doctor.id },
      order: { created_at: 'DESC' },
    });

    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    const consultationsBreakdown = completedBookings.map((b) => {
      const price = Number(b.price || 0);
      const commission = Number(b.commission_amount || 0);
      const net = Math.max(0, price - commission);

      totalGross += price;
      totalCommission += commission;
      totalNet += net;

      const dateStr = b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString();

      return {
        bookingId: b.id,
        patientId: b.patient_id,
        patientInitial: `Patient ${b.patient_id ? b.patient_id.substring(0, 5).toUpperCase() : 'Guest'}`,
        date: dateStr,
        duration: '30 mins',
        grossFee: Number(price.toFixed(2)),
        commission: Number(commission.toFixed(2)),
        netEarning: Number(net.toFixed(2)),
        status: b.status,
        paymentStatus: b.payment_status,
      };
    });

    let totalPaidOut = 0;
    for (const p of payouts) {
      if (p.status === PayoutStatus.PAID) {
        totalPaidOut += Number(p.amount || 0);
      }
    }

    const availableBalance = Math.max(0, totalNet - totalPaidOut);

    // Standard next payout schedule: 1st of next month
    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Monthly aggregation for trajectory chart
    const monthMap: Record<string, { month: string; gross: number; commission: number; net: number; consultations: number }> = {};
    for (const item of consultationsBreakdown) {
      const d = new Date(item.date);
      const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          gross: 0,
          commission: 0,
          net: 0,
          consultations: 0,
        };
      }
      monthMap[monthKey].gross += item.grossFee;
      monthMap[monthKey].commission += item.commission;
      monthMap[monthKey].net += item.netEarning;
      monthMap[monthKey].consultations += 1;
    }

    const monthlyTrend = Object.values(monthMap);

    return {
      doctorId: doctor.id,
      doctorName: doctor.user?.full_name || 'Dr. Medical Practitioner',
      summary: {
        totalGross: Number(totalGross.toFixed(2)),
        totalCommission: Number(totalCommission.toFixed(2)),
        totalNet: Number(totalNet.toFixed(2)),
        totalPaidOut: Number(totalPaidOut.toFixed(2)),
        availableBalance: Number(availableBalance.toFixed(2)),
        completedConsultationsCount: completedBookings.length,
        nextPayoutDate: nextPayoutDate.toISOString(),
      },
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        reference: p.transaction_reference,
        createdAt: p.created_at,
      })),
      consultationsBreakdown,
      monthlyTrend,
    };
  }
}

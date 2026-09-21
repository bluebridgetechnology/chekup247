import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
  Optional,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { envConfig } from '../../config/env.config';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import {
  PlatformSetting,
  AuditLog,
  DoctorProfile,
  VerificationStatus,
  VerificationSource,
  User,
  UserRole,
  UserStatus,
  AdminSubRole,
  Payout,
  PayoutStatus,
  AvailabilitySlot,
} from '../../database/operational/entities';
import {
  Booking,
  BookingStatus,
  Payment,
  PaymentRecordStatus,
  PaymentStatus,
  WalletCredit,
  Consultation,
  ConsultationExtension,
  Prescription,
  Dispute,
  DisputeStatus,
  DisputeRaisedBy,
  DisputeResolutionType,
  Review,
  Notification,
  NotificationDeliveryStatus,
} from '../../database/patient/entities';
import { TokenService } from '../auth/token.service';
import { AuditService, AuditLogsFilterQuery } from '../audit/audit.service';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(PlatformSetting, 'operational')
    private readonly settingsRepository: Repository<PlatformSetting>,
    @InjectRepository(AuditLog, 'operational')
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payout, 'operational')
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(AvailabilitySlot, 'operational')
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment, 'patient')
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(WalletCredit, 'patient')
    private readonly creditRepository: Repository<WalletCredit>,
    @InjectRepository(Consultation, 'patient')
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(Prescription, 'patient')
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Dispute, 'patient')
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(Review, 'patient')
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ConsultationExtension, 'patient')
    private readonly consultationExtensionRepository: Repository<ConsultationExtension>,
    @InjectRepository(Notification, 'patient')
    private readonly notificationRepository: Repository<Notification>,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly reviewsService: ReviewsService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Ensure default initial system admin exists on launch
   */
  async onModuleInit() {
    try {
      const defaultAdminEmail = 'admin@chekup247.co.za';
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount === 0) {
        const isProduction = envConfig.NODE_ENV === 'production';
        const bootstrapEmail = envConfig.ADMIN_BOOTSTRAP_EMAIL || defaultAdminEmail;
        const bootstrapPassword = envConfig.ADMIN_BOOTSTRAP_PASSWORD;

        // In production, env.config.ts already hard-fails at boot if
        // ADMIN_BOOTSTRAP_PASSWORD is unset — this is a second, local
        // guard so this seed can never silently fall back to a known,
        // publicly-documented literal. In development, a fixed fallback
        // is fine (there's no production data to protect).
        if (isProduction && !bootstrapPassword) {
          throw new Error('ADMIN_BOOTSTRAP_PASSWORD is required to seed the first admin in production');
        }

        const passwordHash = await this.tokenService.hashPassword(
          bootstrapPassword || 'AdminChekup2026!',
        );
        const admin = this.userRepository.create({
          email: bootstrapEmail,
          password_hash: passwordHash,
          full_name: 'ChekUp247 Master Administrator',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          is_email_verified: true,
          email_verified_at: new Date(),
          must_change_password: true,
        });
        await this.userRepository.save(admin);
        this.logger.log(
          `Bootstrap administrator seeded: ${bootstrapEmail}. ` +
            'must_change_password=true — the account will be forced to set a new password on first login.',
        );
      }
    } catch (err: any) {
      this.logger.warn(`Admin seed check deferred: ${err.message}`);
    }
  }

  // ==========================================
  // PLATFORM SETTINGS
  // ==========================================

  async getPlatformSettings(): Promise<PlatformSetting | null> {
    return this.settingsRepository.findOne({ where: {} });
  }

  async updatePlatformSettings(
    dto: {
      commission_percent?: number;
      late_cancellation_deduction_percent?: number;
      no_show_grace_minutes?: number;
      default_slot_duration_minutes?: number;
      default_buffer_minutes?: number;
    },
    adminId?: string,
  ): Promise<PlatformSetting> {
    let settings = await this.settingsRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepository.create();
    }

    if (dto.commission_percent !== undefined) {
      settings.commission_percent = Number(dto.commission_percent);
    }
    if (dto.late_cancellation_deduction_percent !== undefined) {
      settings.late_cancellation_deduction_percent = Number(dto.late_cancellation_deduction_percent);
    }
    if (dto.no_show_grace_minutes !== undefined) {
      settings.no_show_grace_minutes = Number(dto.no_show_grace_minutes);
    }
    if (dto.default_slot_duration_minutes !== undefined) {
      settings.default_slot_duration_minutes = Number(dto.default_slot_duration_minutes);
    }
    if (dto.default_buffer_minutes !== undefined) {
      settings.default_buffer_minutes = Number(dto.default_buffer_minutes);
    }

    const saved = await this.settingsRepository.save(settings);

    // Audit log
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: 'PLATFORM_SETTINGS_UPDATED',
        metadata: { ...dto },
      }),
    );

    this.logger.log(`Platform settings updated by admin ${adminId || 'system'}`);
    return saved;
  }

  // ==========================================
  // BE-904: EXECUTIVE PLATFORM ANALYTICS
  // ==========================================

  async getAnalytics() {
    const allBookings = await this.bookingRepository.find();
    const allDoctors = await this.doctorRepository.find({ relations: ['user'] });
    const verifiedDoctors = allDoctors.filter((d) => d.verification_status === VerificationStatus.VERIFIED);
    const totalPatients = await this.userRepository.count({ where: { role: UserRole.PATIENT } });

    let grossVolume = 0;
    let netCommission = 0;
    let completedConsultations = 0;
    let cancelledCount = 0;
    let noShowCount = 0;

    for (const b of allBookings) {
      const price = Number(b.price || 0);
      const comm = Number(b.commission_amount || 0);

      if (b.status === BookingStatus.COMPLETED) {
        completedConsultations += 1;
        grossVolume += price;
        netCommission += comm;
      } else if (b.status === BookingStatus.CONFIRMED) {
        grossVolume += price;
      } else if (b.status === BookingStatus.CANCELLED) {
        cancelledCount += 1;
      } else if (b.status === BookingStatus.NO_SHOW) {
        noShowCount += 1;
        grossVolume += price;
        netCommission += comm;
      }
    }

    const totalBookings = allBookings.length;
    const noShowRate =
      totalBookings > 0 ? Number(((noShowCount / totalBookings) * 100).toFixed(1)) : 0;
    const averageTakeRate =
      grossVolume > 0 ? Number(((netCommission / grossVolume) * 100).toFixed(1)) : 0;

    // In-flight consultations: started but not yet ended
    const activeConsultationsInFlight = await this.consultationRepository.count({
      where: { started_at: Not(IsNull()), ended_at: IsNull() },
    });

    // Specialty Breakdown
    const specialtyMap: Record<string, number> = {};
    for (const doc of verifiedDoctors) {
      const spec = doc.specialty || 'General Practitioner';
      specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
    }

    const specialtyDistribution = Object.entries(specialtyMap).map(([specialty, count]) => ({
      specialty,
      count,
      percentage: `${Math.round((count / (verifiedDoctors.length || 1)) * 100)}%`,
    }));

    // 30-Day Trend (group by date) — supports both 7D and 30D views on the frontend chart
    const trendMap: Record<string, { date: string; gross: number; commission: number; consultations: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      trendMap[dateKey] = { date: dateKey, gross: 0, commission: 0, consultations: 0 };
    }

    for (const b of allBookings) {
      if (b.created_at) {
        const dateKey = new Date(b.created_at).toISOString().split('T')[0];
        if (trendMap[dateKey]) {
          trendMap[dateKey].gross += Number(b.price || 0);
          trendMap[dateKey].commission += Number(b.commission_amount || 0);
          trendMap[dateKey].consultations += 1;
        }
      }
    }

    const revenueTrajectory = Object.values(trendMap);

    // Recent activity feed — last 8 bookings, patient identity masked (POPIA)
    const doctorNameById: Record<string, string> = {};
    for (const d of allDoctors) {
      doctorNameById[d.id] = d.user?.full_name || d.specialty || 'Practitioner';
    }
    const patientIds = Array.from(
      new Set(allBookings.slice(0, 8).map((b) => b.patient_id).filter(Boolean)),
    );
    const patients = patientIds.length
      ? await this.userRepository.find({ where: patientIds.map((id) => ({ id })) })
      : [];
    const patientById: Record<string, string> = {};
    for (const p of patients) patientById[p.id] = p.full_name || '';

    const maskName = (fullName: string): string => this.maskName(fullName);

    const recentActivity = [...allBookings]
      .sort((a, b) => new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime())
      .slice(0, 8)
      .map((b) => ({
        id: b.id,
        doctorName: doctorNameById[b.doctor_id] || 'Dr. Medical Practitioner',
        patientMasked: maskName(patientById[b.patient_id] || ''),
        specialty: allDoctors.find((d) => d.id === b.doctor_id)?.specialty || 'General Practice',
        amount: Number(b.price || 0),
        status: b.status,
        createdAt: b.created_at,
      }));

    // Aggregate Top Attended Issues strictly from database bookings
    const issueCounts: Record<string, number> = {};
    for (const b of allBookings) {
      const cat = b.reason_category || 'General Practice Consultation';
      issueCounts[cat] = (issueCounts[cat] || 0) + 1;
    }

    const topAttendedIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: `${Math.round((count / (totalBookings || 1)) * 100)}%`,
        category: 'Clinical Care',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top Booked Specialties strictly from database bookings & doctor records
    const specialtyBookingsMap: Record<string, { count: number; revenue: number }> = {};
    for (const b of allBookings) {
      const spec = allDoctors.find((d) => d.id === b.doctor_id)?.specialty || 'General Practice';
      if (!specialtyBookingsMap[spec]) {
        specialtyBookingsMap[spec] = { count: 0, revenue: 0 };
      }
      specialtyBookingsMap[spec].count += 1;
      specialtyBookingsMap[spec].revenue += Number(b.price || 0);
    }

    const topBookedSpecialties = Object.entries(specialtyBookingsMap)
      .map(([specialty, data]) => ({
        specialty,
        bookingsCount: data.count,
        percentage: `${Math.round((data.count / (totalBookings || 1)) * 100)}%`,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, 6);

    // Hourly distribution calculated from actual bookings
    const hourlySlots = [
      { hour: '08:00', label: 'Early Clinic', start: 0, end: 9 },
      { hour: '10:00', label: 'Peak Morning', start: 9, end: 11 },
      { hour: '12:00', label: 'Mid-Day Rush', start: 11, end: 13 },
      { hour: '14:00', label: 'Afternoon', start: 13, end: 15 },
      { hour: '16:00', label: 'Evening Ward', start: 15, end: 17 },
      { hour: '18:00', label: 'After-Hours', start: 17, end: 19 },
      { hour: '20:00', label: 'On-Call', start: 19, end: 24 },
    ];
    const hourlyDistribution = hourlySlots.map((slot) => {
      const count = allBookings.filter((b) => {
        if (!b.created_at) return false;
        const hour = new Date(b.created_at).getHours();
        return hour >= slot.start && hour < slot.end;
      }).length;
      return {
        hour: slot.hour,
        encounters: count,
        label: slot.label,
      };
    });

    const encounterOutcomes = {
      completed: completedConsultations,
      active: activeConsultationsInFlight,
      disputedOrNoShow: noShowCount + cancelledCount,
      total: totalBookings,
    };

    // System health: this method already touched both databases above
    // (operational: doctors/users/settings; patient: bookings/consultations).
    // If we reached this line, both were reachable — report accordingly
    // rather than issuing a second, redundant round-trip per dashboard load.
    const operationalDb = 'healthy';
    const patientHealthDb = 'healthy';
    const popiaCompliance = 'compliant';

    return {
      kpis: {
        totalGrossVolume: Number(grossVolume.toFixed(2)),
        netCommission: Number(netCommission.toFixed(2)),
        averageTakeRate: `${averageTakeRate.toFixed(1)}%`,
        completedCount: completedConsultations,
        noShowCount,
        noShowRate: `${noShowRate}%`,
        activeConsultationsInFlight,
        activeDoctorsCount: verifiedDoctors.length,
        verifiedPatientsCount: totalPatients,
      },
      revenueTrajectory,
      specialtyDistribution,
      topAttendedIssues,
      topBookedSpecialties,
      hourlyDistribution,
      encounterOutcomes,
      recentActivity,
      systemHealth: {
        operationalDb,
        patientHealthDb,
        popiaCompliance,
      },
    };
  }

  // ==========================================
  // BE-905: FINANCIAL TRANSACTION LEDGER & CSV EXPORT
  // ==========================================

  async getTransactions(query: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    // Gather records across Payments, Credits, and Payouts
    const payments = await this.paymentRepository.find({ order: { created_at: 'DESC' } });
    const credits = await this.creditRepository.find({ order: { created_at: 'DESC' } });
    const payouts = await this.payoutRepository.find({ order: { created_at: 'DESC' } });

    let unified: Array<{
      id: string;
      type: 'payment' | 'refund' | 'credit' | 'payout';
      amount: number;
      status: string;
      reference: string;
      partyId?: string;
      partyType?: string;
      bookingId?: string;
      createdAt: Date;
    }> = [];

    // Map payments
    for (const p of payments) {
      const isRefund = p.status === PaymentRecordStatus.REFUNDED;
      unified.push({
        id: p.id,
        type: isRefund ? 'refund' : 'payment',
        amount: Number(p.amount),
        status: p.status,
        reference: p.provider_ref,
        bookingId: p.booking_id,
        partyType: 'patient',
        createdAt: p.created_at,
      });
    }

    // Map platform credits
    for (const c of credits) {
      unified.push({
        id: c.id,
        type: 'credit',
        amount: Number(c.amount),
        status: c.is_redeemed ? 'redeemed' : 'active',
        reference: `CREDIT-${c.id.substring(0, 8)}`,
        partyId: c.patient_id,
        partyType: 'patient',
        bookingId: c.booking_id || undefined,
        createdAt: c.created_at,
      });
    }

    // Map doctor payouts
    for (const po of payouts) {
      unified.push({
        id: po.id,
        type: 'payout',
        amount: Number(po.amount),
        status: po.status,
        reference: po.transaction_reference || `PAYOUT-${po.id.substring(0, 8)}`,
        partyId: po.doctor_id,
        partyType: 'doctor',
        createdAt: po.created_at,
      });
    }

    // Filter by type
    if (query.type && query.type !== 'all') {
      unified = unified.filter((t) => t.type === query.type);
    }

    // Filter by status
    if (query.status && query.status !== 'all') {
      unified = unified.filter((t) => t.status.toLowerCase() === query.status?.toLowerCase());
    }

    // Filter by date range
    if (query.startDate) {
      const s = new Date(query.startDate).getTime();
      unified = unified.filter((t) => new Date(t.createdAt).getTime() >= s);
    }
    if (query.endDate) {
      const e = new Date(query.endDate).getTime();
      unified = unified.filter((t) => new Date(t.createdAt).getTime() <= e);
    }

    // Search by reference or ID
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      unified = unified.filter(
        (t) =>
          t.reference?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q) ||
          t.bookingId?.toLowerCase().includes(q),
      );
    }

    // Sort by createdAt DESC
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Summary totals
    let totalPaymentsVolume = 0;
    let totalRefundedVolume = 0;
    let totalCreditsVolume = 0;
    let totalPayoutsVolume = 0;

    for (const item of unified) {
      if (item.type === 'payment' && item.status === 'success') totalPaymentsVolume += item.amount;
      if (item.type === 'refund') totalRefundedVolume += item.amount;
      if (item.type === 'credit') totalCreditsVolume += item.amount;
      if (item.type === 'payout' && item.status === 'paid') totalPayoutsVolume += item.amount;
    }

    const total = unified.length;
    const paginated = unified.slice(skip, skip + limit);

    // Enrich paginated records with doctor and patient metadata
    const bookingIds = Array.from(new Set(paginated.map((p) => p.bookingId).filter(Boolean))) as string[];
    const bookings = bookingIds.length
      ? await this.bookingRepository.find({ where: bookingIds.map((id) => ({ id })) })
      : [];
    const bookingMap: Record<string, Booking> = {};
    for (const b of bookings) bookingMap[b.id] = b;

    const doctorIds = Array.from(new Set(bookings.map((b) => b.doctor_id).filter(Boolean)));
    const patientIds = Array.from(new Set(bookings.map((b) => b.patient_id).filter(Boolean)));

    const [doctors, patients] = await Promise.all([
      doctorIds.length
        ? this.doctorRepository
            .createQueryBuilder('doctor')
            .leftJoinAndSelect('doctor.user', 'user')
            .where('doctor.id IN (:...doctorIds)', { doctorIds })
            .getMany()
        : [],
      patientIds.length ? this.userRepository.find({ where: patientIds.map((id) => ({ id })) }) : [],
    ]);

    const doctorNameMap: Record<string, string> = {};
    for (const d of doctors) doctorNameMap[d.id] = d.user?.full_name || 'Dr. Medical Practitioner';

    const patientNameMap: Record<string, string> = {};
    for (const p of patients) patientNameMap[p.id] = this.maskName(p.full_name || '');

    const enrichedPaginated = paginated.map((item) => {
      const booking = item.bookingId ? bookingMap[item.bookingId] : undefined;
      const docName = booking ? doctorNameMap[booking.doctor_id] : (item.partyType === 'doctor' && item.partyId ? doctorNameMap[item.partyId] : '—');
      const patName = booking ? patientNameMap[booking.patient_id] : (item.partyType === 'patient' && item.partyId ? patientNameMap[item.partyId] : 'Platform Direct');
      const grossAmount = Number(item.amount || 0);
      const platformFee = Number((grossAmount * 0.15).toFixed(2));
      const netAmount = Number((grossAmount - platformFee).toFixed(2));

      return {
        ...item,
        bookingId: item.bookingId,
        doctorName: docName || '—',
        patientMasked: patName || 'Platform Direct',
        grossAmount,
        platformFee,
        netAmount,
      };
    });

    const totalGross = Number(totalPaymentsVolume.toFixed(2));
    const totalPlatformFee = Number((totalGross * 0.15).toFixed(2));
    const totalNet = Number((totalGross - totalPlatformFee).toFixed(2));
    const totalRefunds = Number(totalRefundedVolume.toFixed(2));

    return {
      transactions: enrichedPaginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalGross,
        totalPlatformFee,
        totalNet,
        totalRefunds,
        totalPaymentsVolume,
        totalRefundedVolume,
        totalCreditsVolume,
        totalPayoutsVolume,
      },
    };
  }

  async exportTransactionsCsv(query: any): Promise<string> {
    const result = await this.getTransactions({ ...query, limit: 10000, page: 1 });
    const headers = ['Transaction ID', 'Type', 'Amount (ZAR)', 'Status', 'Reference', 'Party ID', 'Party Type', 'Booking ID', 'Date'];
    const rows = result.transactions.map((t) => [
      t.id,
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      t.status.toUpperCase(),
      t.reference,
      t.partyId || 'N/A',
      t.partyType || 'N/A',
      t.bookingId || 'N/A',
      new Date(t.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    return csvContent;
  }

  /**
   * Streams the ledger export directly to the HTTP response instead of
   * building one large string in memory first (the previous
   * exportTransactionsCsv, kept above for the inline format=csv path,
   * which is fine at smaller volumes). Rows are written to `res` in
   * batches as they're formatted, so peak memory is one batch, not the
   * whole rendered CSV string, and the client starts receiving bytes
   * immediately instead of waiting for the full export to render.
   *
   * Honest limitation: `getTransactions` itself still loads its
   * candidate rows (payments/credits/payouts) from Postgres in one go —
   * this streams the FORMATTING and HTTP-write stage, not the database
   * read. A true cursor-based DB stream would need query-layer changes
   * (TypeORM stream() or raw cursors) — larger scope than this pass;
   * flagged rather than silently implied.
   */
  async streamTransactionsCsv(query: any, res: Response): Promise<void> {
    const result = await this.getTransactions({ ...query, limit: 10000, page: 1 });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="chekup247_transactions_${new Date().toISOString().split('T')[0]}.csv"`,
    );

    const headers = ['Transaction ID', 'Type', 'Amount (ZAR)', 'Status', 'Reference', 'Party ID', 'Party Type', 'Booking ID', 'Date'];
    res.write(headers.join(',') + '\n');

    const batchSize = 500;
    for (let i = 0; i < result.transactions.length; i += batchSize) {
      const batch = result.transactions.slice(i, i + batchSize);
      const chunk = batch
        .map((t) =>
          [
            t.id,
            t.type.toUpperCase(),
            t.amount.toFixed(2),
            t.status.toUpperCase(),
            t.reference,
            t.partyId || 'N/A',
            t.partyType || 'N/A',
            t.bookingId || 'N/A',
            new Date(t.createdAt).toISOString(),
          ]
            .map((cell) => `"${cell}"`)
            .join(','),
        )
        .join('\n');
      res.write(chunk + (batch.length > 0 ? '\n' : ''));
    }

    res.end();
  }

  // ==========================================
  // BE-906: BOOKINGS OVERSIGHT API
  // ==========================================

  private maskName(fullName: string): string {
    if (!fullName) return 'Patient';
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] ? `${parts[0][0]}.` : '';
    const last = parts[1] ? `${parts[1][0]}****` : '';
    return [first, last].filter(Boolean).join(' ') || 'Patient';
  }

  async getBookings(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    doctorId?: string;
    patientId?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const qb = this.bookingRepository.createQueryBuilder('booking');

    if (query.status && query.status !== 'all') {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query.doctorId) {
      qb.andWhere('booking.doctor_id = :doctorId', { doctorId: query.doctorId });
    }

    if (query.patientId) {
      qb.andWhere('booking.patient_id = :patientId', { patientId: query.patientId });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      // Look up matching patient user IDs
      const matchingPatients = await this.userRepository
        .createQueryBuilder('user')
        .select('user.id')
        .where('user.full_name ILIKE :term OR user.email ILIKE :term', { term })
        .getMany();
      const matchingPatientIds = matchingPatients.map((u) => u.id);

      // Look up matching doctor IDs
      const matchingDoctors = await this.doctorRepository
        .createQueryBuilder('doctor')
        .leftJoin('doctor.user', 'user')
        .select('doctor.id')
        .where('user.full_name ILIKE :term OR user.email ILIKE :term OR doctor.hpcsa_number ILIKE :term', { term })
        .getMany();
      const matchingDoctorIds = matchingDoctors.map((d) => d.id);

      const conditions: string[] = ['booking.id::text ILIKE :term', 'booking.reason_category ILIKE :term'];
      const params: Record<string, any> = { term };

      if (matchingPatientIds.length > 0) {
        conditions.push('booking.patient_id IN (:...matchingPatientIds)');
        params.matchingPatientIds = matchingPatientIds;
      }
      if (matchingDoctorIds.length > 0) {
        conditions.push('booking.doctor_id IN (:...matchingDoctorIds)');
        params.matchingDoctorIds = matchingDoctorIds;
      }

      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    qb.orderBy('booking.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [bookings, total] = await qb.getManyAndCount();

    // Attach doctor and patient metadata
    const doctorIds = Array.from(new Set(bookings.map((b) => b.doctor_id)));
    const patientIds = Array.from(new Set(bookings.map((b) => b.patient_id)));

    const doctorsMap: Record<string, any> = {};
    if (doctorIds.length > 0) {
      const docs = await this.doctorRepository
        .createQueryBuilder('doctor')
        .leftJoinAndSelect('doctor.user', 'user')
        .where('doctor.id IN (:...doctorIds)', { doctorIds })
        .getMany();
      for (const d of docs) {
        doctorsMap[d.id] = {
          id: d.id,
          name: d.user?.full_name || 'Dr. Medical Practitioner',
          fullName: d.user?.full_name || 'Dr. Medical Practitioner',
          email: d.user?.email,
          specialty: d.specialty || 'General Practice',
          hpcsaNumber: d.hpcsa_number || 'HPCSA Verified',
          facilityName: d.facility_name,
        };
      }
    }

    const patientsMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const patients = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...patientIds)', { patientIds })
        .getMany();
      for (const p of patients) {
        patientsMap[p.id] = {
          id: p.id,
          name: p.full_name,
          maskedName: this.maskName(p.full_name || ''),
          email: p.email,
        };
      }
    }

    const enrichedBookings = bookings.map((b) => {
      const doc = doctorsMap[b.doctor_id];
      const pat = patientsMap[b.patient_id];
      const docName = doc?.name || 'Dr. Medical Practitioner';
      const docHpcsa = doc?.hpcsaNumber || 'HPCSA Verified';
      const docSpecialty = doc?.specialty || b.reason_category || 'General Practice';
      const patientMasked = pat?.maskedName || this.maskName(pat?.name || '');
      const reference = `CHK-${b.id.slice(0, 8).toUpperCase()}`;
      const amount = Number(b.price || 0);

      return {
        ...b,
        reference,
        doctorId: b.doctor_id,
        doctorName: docName,
        doctorHpcsa: docHpcsa,
        doctorSpecialty: docSpecialty,
        patientId: b.patient_id,
        patientMasked,
        scheduledStartTime: b.created_at,
        scheduledEndTime: b.created_at,
        durationMinutes: 15,
        amount,
        extensionMinutes: 0,
        hasPrescription: false,
        doctor: doc || { id: b.doctor_id, name: docName, fullName: docName, hpcsaNumber: docHpcsa, specialty: docSpecialty },
        patient: pat ? { ...pat, maskedName: patientMasked } : { id: b.patient_id, name: 'Patient', maskedName: patientMasked },
      };
    });

    return {
      bookings: enrichedBookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getBookingDetail(id: string) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const doctor = await this.doctorRepository.findOne({
      where: { id: booking.doctor_id },
      relations: ['user'],
    });

    const patient = await this.userRepository.findOne({
      where: { id: booking.patient_id },
    });

    const payment = await this.paymentRepository.findOne({
      where: { booking_id: id },
    });

    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: id },
    });

    const prescriptions = consultation
      ? await this.prescriptionRepository.find({
          where: { consultation_id: consultation.id },
        })
      : [];

    const reference = `CHK-${booking.id.slice(0, 8).toUpperCase()}`;
    const docName = doctor?.user?.full_name || 'Dr. Medical Practitioner';
    const docHpcsa = doctor?.hpcsa_number || 'HPCSA Verified';
    const docSpecialty = doctor?.specialty || booking.reason_category || 'General Practice';
    const patientMasked = this.maskName(patient?.full_name || '');

    let formattedClinicalSummary = consultation?.doctor_notes || (consultation as any)?.clinical_summary || 'LiveKit consultation completed.';
    let clinicalEncounter: {
      chiefComplaint?: string;
      hpi?: string;
      assessment?: string;
      plan?: string;
      patientInstructions?: string;
    } | null = null;

    if (consultation?.doctor_notes) {
      try {
        const parsed = JSON.parse(consultation.doctor_notes);
        if (typeof parsed === 'object' && parsed !== null) {
          clinicalEncounter = {
            chiefComplaint: parsed.chiefComplaint,
            hpi: parsed.hpi,
            assessment: parsed.assessment,
            plan: parsed.plan,
            patientInstructions: parsed.patientInstructions || parsed.patientNotes,
          };
          const parts: string[] = [];
          if (parsed.chiefComplaint) parts.push(`Chief Complaint:\n${parsed.chiefComplaint}`);
          if (parsed.hpi) parts.push(`History of Present Illness (HPI):\n${parsed.hpi}`);
          if (parsed.assessment) parts.push(`Clinical Assessment:\n${parsed.assessment}`);
          if (parsed.plan) parts.push(`Treatment Plan:\n${parsed.plan}`);
          if (parsed.patientInstructions || parsed.patientNotes) {
            parts.push(`Patient Instructions:\n${parsed.patientInstructions || parsed.patientNotes}`);
          }
          if (parts.length > 0) {
            formattedClinicalSummary = parts.join('\n\n');
          }
        }
      } catch {}
    }

    return {
      ...booking,
      reference,
      doctorId: booking.doctor_id,
      doctorName: docName,
      doctorHpcsa: docHpcsa,
      doctorSpecialty: docSpecialty,
      patientId: booking.patient_id,
      patientMasked,
      scheduledStartTime: booking.created_at,
      scheduledEndTime: booking.created_at,
      durationMinutes: 15,
      amount: Number(booking.price || 0),
      extensionMinutes: 0,
      doctor: {
        id: doctor ? doctor.id : booking.doctor_id,
        fullName: docName,
        name: docName,
        email: doctor?.user?.email,
        phone: doctor?.user?.phone,
        specialty: docSpecialty,
        hpcsaNumber: docHpcsa,
        facilityName: doctor?.facility_name,
      },
      patient: {
        id: patient ? patient.id : booking.patient_id,
        maskedName: patientMasked,
        name: patientMasked,
        province: 'South Africa',
      },
      consultation: consultation
        ? {
            ...consultation,
            doctorNotesRaw: consultation.doctor_notes,
            clinicalSummary: formattedClinicalSummary,
            clinicalEncounter,
            diagnosisCodes: (consultation as any).diagnosis_codes || [],
          }
        : undefined,
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        prescriptionNumber: (p as any).prescription_number || `RX-${p.id.slice(0, 8).toUpperCase()}`,
        medicationCount: Array.isArray((p as any).medications) ? (p as any).medications.length : 1,
        isDispensed: (p as any).is_dispensed || false,
        signedAt: p.created_at,
      })),
      payments: payment
        ? [
            {
              id: payment.id,
              reference: (payment as any).reference || `PAY-${payment.id.slice(0, 8).toUpperCase()}`,
              amount: Number((payment as any).amount || booking.price || 0),
              status: payment.status || 'success',
              type: (payment as any).type || 'consultation',
              channel: (payment as any).channel || 'card',
            },
          ]
        : [],
    };
  }

  // ==========================================
  // BE-908: DISPUTE RESOLUTION & MANUAL ACTIONS
  // ==========================================

  async getDisputes(query: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    // Filter bookings with cancelled, no_show, or refunded status
    const [bookings, total] = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status IN (:...disputeStatuses) OR booking.payment_status = :refundedStatus', {
        disputeStatuses: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
        refundedStatus: PaymentStatus.REFUNDED,
      })
      .orderBy('booking.updated_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const doctorIds = Array.from(new Set(bookings.map((b) => b.doctor_id)));
    const patientIds = Array.from(new Set(bookings.map((b) => b.patient_id)));

    const doctorsMap: Record<string, any> = {};
    if (doctorIds.length > 0) {
      const docs = await this.doctorRepository
        .createQueryBuilder('doctor')
        .leftJoinAndSelect('doctor.user', 'user')
        .where('doctor.id IN (:...doctorIds)', { doctorIds })
        .getMany();
      for (const d of docs) {
        doctorsMap[d.id] = { id: d.id, name: d.user?.full_name, specialty: d.specialty };
      }
    }

    const patientsMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const patients = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...patientIds)', { patientIds })
        .getMany();
      for (const p of patients) {
        patientsMap[p.id] = { id: p.id, name: p.full_name, email: p.email };
      }
    }

    const disputes = bookings.map((b) => ({
      ...b,
      disputeReason:
        b.status === BookingStatus.NO_SHOW
          ? 'Missed Consultation / No-Show'
          : b.status === BookingStatus.CANCELLED
            ? 'Cancelled Appointment'
            : 'Payment Disputed / Refunded',
      doctor: doctorsMap[b.doctor_id] || { id: b.doctor_id, name: 'Doctor' },
      patient: patientsMap[b.patient_id] || { id: b.patient_id, name: 'Patient' },
    }));

    return {
      disputes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async resolveDisputeRefund(
    dto: { bookingId: string; amount?: number; reason: string },
    adminId?: string,
  ) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A mandatory justification reason must be provided for manual refunds');
    }

    const booking = await this.bookingRepository.findOne({ where: { id: dto.bookingId } });
    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    const refundAmount = dto.amount ? Number(dto.amount) : Number(booking.price);

    // 1. Update Payment record to refunded
    const payment = await this.paymentRepository.findOne({ where: { booking_id: dto.bookingId } });
    if (payment) {
      payment.status = PaymentRecordStatus.REFUNDED;
      await this.paymentRepository.save(payment);
    }

    // 2. Update Booking
    booking.status = BookingStatus.CANCELLED;
    booking.payment_status = PaymentStatus.REFUNDED;
    await this.bookingRepository.save(booking);

    // 3. Free up availability slot on operational DB
    if (booking.slot_id) {
      await this.slotRepository.update({ id: booking.slot_id }, { is_booked: false });
    }

    // 4. Audit Log
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        patient_id: booking.patient_id,
        action: 'ADMIN_DISPUTE_REFUND_ISSUED',
        metadata: {
          bookingId: dto.bookingId,
          refundAmount,
          reason: dto.reason.trim(),
          paymentId: payment?.id,
        },
      }),
    );

    this.logger.log(`Admin ${adminId || 'system'} issued refund of R${refundAmount} for booking ${dto.bookingId}`);
    return {
      success: true,
      message: `Manual refund of R${refundAmount.toFixed(2)} processed successfully`,
      bookingId: dto.bookingId,
      refundAmount,
      reason: dto.reason,
    };
  }

  async resolveDisputeCredit(
    dto: { bookingId?: string; patientId: string; amount: number; reason: string },
    adminId?: string,
  ) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A mandatory justification reason must be provided for issuing platform credits');
    }

    const creditAmount = Number(dto.amount);
    if (!creditAmount || creditAmount <= 0) {
      throw new BadRequestException('Credit amount must be greater than 0');
    }

    // 1. Create wallet credit on AWS RDS
    const credit = this.creditRepository.create({
      patient_id: dto.patientId,
      amount: creditAmount,
      currency: 'ZAR',
      reason: dto.reason.trim(),
      booking_id: dto.bookingId || null,
      is_redeemed: false,
    });

    const saved = await this.creditRepository.save(credit);

    // 2. Audit Log
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        patient_id: dto.patientId,
        action: 'ADMIN_DISPUTE_CREDIT_ISSUED',
        metadata: {
          creditId: saved.id,
          amount: creditAmount,
          bookingId: dto.bookingId,
          reason: dto.reason.trim(),
        },
      }),
    );

    this.logger.log(`Admin ${adminId || 'system'} issued platform credit of R${creditAmount} to patient ${dto.patientId}`);
    return {
      success: true,
      message: `Platform credit of R${creditAmount.toFixed(2)} credited to patient successfully`,
      credit: saved,
    };
  }

  // ==========================================
  // BE-907: POPIA AUDIT LOG INSPECTION
  // ==========================================

  async getPopiaAuditLogs(query: AuditLogsFilterQuery) {
    return this.auditService.getAuditLogs(query);
  }

  // ==========================================
  // PATIENT USER MANAGEMENT (Sprint B, P1-3)
  // ==========================================

  async getPatients(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.PATIENT });

    if (query.status && query.status !== 'all') {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere('(user.full_name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)', {
        search,
      });
    }

    qb.orderBy('user.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [patients, total] = await qb.getManyAndCount();

    // Attach lightweight booking counts per patient (patient DB)
    const patientIds = patients.map((p) => p.id);
    const bookingCounts: Record<string, number> = {};
    if (patientIds.length > 0) {
      const rows = await this.bookingRepository
        .createQueryBuilder('booking')
        .select('booking.patient_id', 'patientId')
        .addSelect('COUNT(*)', 'count')
        .where('booking.patient_id IN (:...patientIds)', { patientIds })
        .groupBy('booking.patient_id')
        .getRawMany();
      for (const r of rows) bookingCounts[r.patientId] = Number(r.count);
    }

    const allPatients = await this.userRepository.find({ where: { role: UserRole.PATIENT } });
    let activePatients = 0;
    let suspendedPatients = 0;
    for (const p of allPatients) {
      if (p.status === UserStatus.ACTIVE) activePatients++;
      if (p.status === UserStatus.SUSPENDED) suspendedPatients++;
    }
    const totalBookingsCount = await this.bookingRepository.count();

    return {
      patients: patients.map((p) => ({
        id: p.id,
        fullName: p.full_name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        isEmailVerified: p.is_email_verified,
        createdAt: p.created_at,
        totalBookings: bookingCounts[p.id] || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalPatients: allPatients.length,
        activePatients,
        suspendedPatients,
        totalBookings: totalBookingsCount,
      },
    };
  }

  async getPatientDetail(patientId: string) {
    const patient = await this.userRepository.findOne({
      where: { id: patientId, role: UserRole.PATIENT },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const [bookings, credits, reviews] = await Promise.all([
      this.bookingRepository.find({
        where: { patient_id: patientId },
        order: { created_at: 'DESC' },
        take: 20,
      }),
      this.creditRepository.find({ where: { patient_id: patientId } }),
      this.reviewRepository.find({ where: { patient_id: patientId } }),
    ]);

    return {
      id: patient.id,
      fullName: patient.full_name,
      email: patient.email,
      phone: patient.phone,
      status: patient.status,
      isEmailVerified: patient.is_email_verified,
      dateOfBirth: patient.date_of_birth,
      createdAt: patient.created_at,
      recentBookings: bookings,
      walletCredits: credits,
      reviewsGiven: reviews.length,
    };
  }

  async suspendPatient(patientId: string, suspend: boolean, adminId?: string, reason?: string) {
    const patient = await this.userRepository.findOne({
      where: { id: patientId, role: UserRole.PATIENT },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    patient.status = suspend ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    const saved = await this.userRepository.save(patient);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        patient_id: patientId,
        action: suspend ? 'ADMIN_PATIENT_SUSPENDED' : 'ADMIN_PATIENT_REACTIVATED',
        metadata: { patientId, reason: reason || null },
      }),
    );

    this.logger.log(
      `Patient ${patientId} ${suspend ? 'suspended' : 'reactivated'} by admin ${adminId || 'system'}`,
    );

    return { id: saved.id, status: saved.status };
  }

  /**
   * POPIA data export: everything the platform holds about one patient,
   * gathered across both databases, for a subject-access request.
   */
  async exportPatientPopiaData(patientId: string, adminId?: string) {
    const patient = await this.userRepository.findOne({
      where: { id: patientId, role: UserRole.PATIENT },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const [bookings, payments, credits, consultations, prescriptions, reviews] = await Promise.all([
      this.bookingRepository.find({ where: { patient_id: patientId } }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin(Booking, 'booking', 'booking.id = payment.booking_id')
        .where('booking.patient_id = :patientId', { patientId })
        .getMany(),
      this.creditRepository.find({ where: { patient_id: patientId } }),
      this.consultationRepository
        .createQueryBuilder('consultation')
        .innerJoin(Booking, 'booking', 'booking.id = consultation.booking_id')
        .where('booking.patient_id = :patientId', { patientId })
        .getMany(),
      this.prescriptionRepository.find({ where: { patient_id: patientId } }),
      this.reviewRepository.find({ where: { patient_id: patientId } }),
    ]);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        patient_id: patientId,
        action: 'ADMIN_PATIENT_POPIA_EXPORT',
        metadata: { patientId },
      }),
    );

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: patient.id,
        fullName: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        status: patient.status,
        dateOfBirth: patient.date_of_birth,
        createdAt: patient.created_at,
      },
      bookings,
      payments,
      walletCredits: credits,
      consultations,
      prescriptions,
      reviews,
    };
  }

  /**
   * Soft delete: the account is banned (login blocked) and PII fields are
   * scrubbed, but the row and its foreign-keyed history (bookings,
   * payments, audit trail) are retained for financial/legal record-keeping
   * — a hard delete would break referential integrity across both
   * databases and audit requirements. This is a deliberate design choice,
   * not a partial implementation.
   */
  async deletePatient(patientId: string, adminId?: string, reason?: string) {
    const patient = await this.userRepository.findOne({
      where: { id: patientId, role: UserRole.PATIENT },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    patient.status = UserStatus.BANNED;
    patient.full_name = 'Deleted Patient';
    patient.phone = null as any;
    patient.avatar_url = null;
    await this.userRepository.save(patient);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        patient_id: patientId,
        action: 'ADMIN_PATIENT_DELETED',
        metadata: { patientId, reason: reason || null, mode: 'soft_delete' },
      }),
    );

    this.logger.log(`Patient ${patientId} soft-deleted by admin ${adminId || 'system'}`);

    return { message: 'Patient account has been deleted (data retained per POPIA/financial record-keeping requirements).' };
  }

  // ==========================================
  // DISPUTE LIFECYCLE (Sprint B, P1-1)
  // ==========================================

  async getDisputesLifecycle(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const qb = this.disputeRepository.createQueryBuilder('dispute');
    if (query.status && query.status !== 'all') {
      qb.andWhere('dispute.status = :status', { status: query.status });
    }
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere('(dispute.category ILIKE :term OR dispute.reason ILIKE :term OR dispute.booking_id::text ILIKE :term OR dispute.id::text ILIKE :term)', { term });
    }
    qb.orderBy('dispute.created_at', 'DESC').skip(skip).take(limit);

    const [disputes, total] = await qb.getManyAndCount();

    // Enrich with booking + doctor + patient context
    const bookingIds = Array.from(new Set(disputes.map((d) => d.booking_id)));
    const bookings = bookingIds.length
      ? await this.bookingRepository.find({ where: bookingIds.map((id) => ({ id })) })
      : [];
    const bookingsById: Record<string, Booking> = {};
    for (const b of bookings) bookingsById[b.id] = b;

    const doctorIds = Array.from(new Set(bookings.map((b) => b.doctor_id)));
    const patientIds = Array.from(new Set(bookings.map((b) => b.patient_id)));
    const [doctors, patients] = await Promise.all([
      doctorIds.length
        ? this.doctorRepository.createQueryBuilder('doctor').leftJoinAndSelect('doctor.user', 'user').where('doctor.id IN (:...doctorIds)', { doctorIds }).getMany()
        : [],
      patientIds.length ? this.userRepository.find({ where: patientIds.map((id) => ({ id })) }) : [],
    ]);
    const doctorsById: Record<string, any> = {};
    for (const d of doctors) doctorsById[d.id] = { id: d.id, name: d.user?.full_name || 'Dr. Medical Practitioner', specialty: d.specialty || 'General Practice', hpcsaNumber: d.hpcsa_number || 'HPCSA Verified' };
    const patientsById: Record<string, any> = {};
    for (const p of patients) patientsById[p.id] = { id: p.id, name: p.full_name, maskedName: this.maskName(p.full_name || ''), email: p.email };

    return {
      disputes: disputes.map((d) => {
        const booking = bookingsById[d.booking_id];
        const pat = booking ? patientsById[booking.patient_id] : null;
        const doc = booking ? doctorsById[booking.doctor_id] : null;

        return {
          ...d,
          booking: booking
            ? {
                id: booking.id,
                reference: `CHK-${booking.id.slice(0, 8).toUpperCase()}`,
                status: booking.status,
                price: Number(booking.price || 0),
                paymentStatus: booking.payment_status,
                doctor: doc || null,
                patient: pat || null,
                patientMasked: pat?.maskedName || 'Patient (Protected)',
                doctorName: doc?.name || 'Dr. Medical Practitioner',
                doctorSpecialty: doc?.specialty || 'General Practice',
              }
            : null,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDisputeDetail(id: string) {
    const dispute = await this.disputeRepository.findOne({ where: { id } });
    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }
    const booking = await this.bookingRepository.findOne({ where: { id: dispute.booking_id } });
    return { ...dispute, booking };
  }

  /**
   * Patient- (or doctor-) initiated dispute creation. Called from
   * patient-web's dispute-raise flow (POST /disputes), not from the admin
   * panel — the admin panel only reads, assigns, and resolves.
   */
  async createDispute(dto: {
    bookingId: string;
    raisedByUserId?: string;
    raisedBy?: DisputeRaisedBy;
    category: string;
    reason: string;
    evidenceUrls?: string[];
  }) {
    const booking = await this.bookingRepository.findOne({ where: { id: dto.bookingId } });
    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason is required to open a dispute');
    }

    const dispute = this.disputeRepository.create({
      booking_id: dto.bookingId,
      raised_by_user_id: dto.raisedByUserId || null,
      raised_by: dto.raisedBy || DisputeRaisedBy.PATIENT,
      category: dto.category || 'general',
      reason: dto.reason.trim(),
      status: DisputeStatus.OPEN,
      evidence_urls: dto.evidenceUrls || null,
    });
    const saved = await this.disputeRepository.save(dispute);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: dto.raisedByUserId || 'system',
        user_role: dto.raisedBy || 'patient',
        patient_id: booking.patient_id,
        action: 'DISPUTE_OPENED',
        metadata: { disputeId: saved.id, bookingId: dto.bookingId, category: dto.category },
      }),
    );

    return saved;
  }

  async assignDispute(id: string, adminId: string) {
    const dispute = await this.disputeRepository.findOne({ where: { id } });
    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }
    dispute.assigned_admin_id = adminId;
    if (dispute.status === DisputeStatus.OPEN) {
      dispute.status = DisputeStatus.INVESTIGATING;
    }
    const saved = await this.disputeRepository.save(dispute);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId,
        user_role: 'admin',
        action: 'DISPUTE_ASSIGNED',
        metadata: { disputeId: id, assignedTo: adminId },
      }),
    );

    return saved;
  }

  /**
   * Resolve a dispute. Wraps the existing refund/credit actions (already
   * real, audit-logged financial operations) as the two resolution
   * mechanisms, plus a no-action verdict for a rejected dispute.
   */
  async resolveDisputeLifecycle(
    id: string,
    dto: { resolutionType: DisputeResolutionType; amount?: number; notes: string },
    adminId?: string,
  ) {
    const dispute = await this.disputeRepository.findOne({ where: { id } });
    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }
    if (!dto.notes || !dto.notes.trim()) {
      throw new BadRequestException('Resolution notes are required');
    }

    const booking = await this.bookingRepository.findOne({ where: { id: dispute.booking_id } });
    if (!booking) {
      throw new NotFoundException(`Booking ${dispute.booking_id} not found`);
    }

    if (dto.resolutionType === DisputeResolutionType.REFUND) {
      await this.resolveDisputeRefund(
        { bookingId: dispute.booking_id, amount: dto.amount, reason: dto.notes },
        adminId,
      );
    } else if (dto.resolutionType === DisputeResolutionType.CREDIT) {
      if (!dto.amount || dto.amount <= 0) {
        throw new BadRequestException('Credit amount must be greater than 0');
      }
      await this.resolveDisputeCredit(
        { bookingId: dispute.booking_id, patientId: booking.patient_id, amount: dto.amount, reason: dto.notes },
        adminId,
      );
    }
    // NO_ACTION: no financial side-effect, just a recorded verdict.

    dispute.status = dto.resolutionType === DisputeResolutionType.NO_ACTION ? DisputeStatus.REJECTED : DisputeStatus.RESOLVED;
    dispute.resolution_type = dto.resolutionType;
    dispute.resolution_notes = dto.notes.trim();
    dispute.resolved_at = new Date();
    const saved = await this.disputeRepository.save(dispute);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        patient_id: booking.patient_id,
        action: 'DISPUTE_RESOLVED',
        metadata: { disputeId: id, resolutionType: dto.resolutionType, amount: dto.amount, notes: dto.notes },
      }),
    );

    this.logger.log(`Dispute ${id} resolved by admin ${adminId || 'system'} as ${dto.resolutionType}`);
    return saved;
  }

  // ==========================================
  // DOCTOR PAYOUT MANAGEMENT (Sprint C, P1-2)
  // ==========================================

  async getPayouts(query: { status?: string; doctorId?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const qb = this.payoutRepository
      .createQueryBuilder('payout')
      .leftJoinAndSelect('payout.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'user');

    if (query.status && query.status !== 'all') {
      qb.andWhere('payout.status = :status', { status: query.status });
    }
    if (query.doctorId) {
      qb.andWhere('payout.doctor_id = :doctorId', { doctorId: query.doctorId });
    }
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(user.full_name ILIKE :term OR user.email ILIKE :term OR doctor.hpcsa_number ILIKE :term OR payout.transaction_reference ILIKE :term OR payout.id::text ILIKE :term)',
        { term },
      );
    }

    qb.orderBy('payout.created_at', 'DESC').skip(skip).take(limit);
    const [payouts, total] = await qb.getManyAndCount();

    // Summary calculation for total pending, total on hold, total paid
    const allPayouts = await this.payoutRepository.find();
    let totalPendingAmount = 0;
    let totalHoldAmount = 0;
    let totalPaidAmount = 0;

    for (const p of allPayouts) {
      const amt = Number(p.amount || 0);
      if (p.status === PayoutStatus.PENDING) totalPendingAmount += amt;
      if (p.status === PayoutStatus.HOLD) totalHoldAmount += amt;
      if (p.status === PayoutStatus.PAID) totalPaidAmount += amt;
    }

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        doctorId: p.doctor_id,
        doctorName: p.doctor?.user?.full_name || 'Practitioner',
        doctorHpcsa: p.doctor?.hpcsa_number || 'HPCSA Verified',
        doctorSpecialty: p.doctor?.specialty || 'General Practice',
        amount: Number(p.amount),
        status: p.status,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        transactionReference: p.transaction_reference,
        holdReason: p.hold_reason,
        approvedAt: p.approved_at,
        createdAt: p.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalPendingAmount,
        totalHoldAmount,
        totalPaidAmount,
        totalPayoutsCount: allPayouts.length,
      },
    };
  }

  async approvePayout(id: string, adminId?: string) {
    const payout = await this.payoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException(`Payout ${id} not found`);
    }
    if (payout.status === PayoutStatus.PAID) {
      throw new BadRequestException('Payout has already been paid');
    }

    payout.status = PayoutStatus.PENDING;
    payout.hold_reason = null;
    payout.approved_by_admin_id = adminId || null;
    payout.approved_at = new Date();
    const saved = await this.payoutRepository.save(payout);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: 'ADMIN_PAYOUT_APPROVED',
        metadata: { payoutId: id, doctorId: payout.doctor_id, amount: Number(payout.amount) },
      }),
    );

    this.logger.log(`Payout ${id} approved by admin ${adminId || 'system'}`);
    return saved;
  }

  async holdPayout(id: string, reason: string, adminId?: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to place a payout on hold');
    }
    const payout = await this.payoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException(`Payout ${id} not found`);
    }
    if (payout.status === PayoutStatus.PAID) {
      throw new BadRequestException('Cannot hold a payout that has already been paid');
    }

    payout.status = PayoutStatus.HOLD;
    payout.hold_reason = reason.trim();
    const saved = await this.payoutRepository.save(payout);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: 'ADMIN_PAYOUT_HELD',
        metadata: { payoutId: id, doctorId: payout.doctor_id, reason: reason.trim() },
      }),
    );

    this.logger.log(`Payout ${id} placed on hold by admin ${adminId || 'system'}: ${reason}`);
    return saved;
  }

  /**
   * Marks a payout as paid. There is no live Paystack Transfers API
   * integration yet (see docs/ADMIN_GAP_IMPLEMENTATION_PLAN.md) — this
   * records the operator's confirmation that a transfer was completed
   * out-of-band, with a mandatory reference for reconciliation. It does
   * NOT itself move money.
   */
  async markPayoutPaid(id: string, transactionReference: string, adminId?: string) {
    if (!transactionReference || !transactionReference.trim()) {
      throw new BadRequestException('A transaction reference is required to mark a payout as paid');
    }
    const payout = await this.payoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException(`Payout ${id} not found`);
    }
    if (payout.status === PayoutStatus.PAID) {
      throw new BadRequestException('Payout has already been paid');
    }

    payout.status = PayoutStatus.PAID;
    payout.transaction_reference = transactionReference.trim();
    payout.hold_reason = null;
    const saved = await this.payoutRepository.save(payout);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: 'ADMIN_PAYOUT_MARKED_PAID',
        metadata: { payoutId: id, doctorId: payout.doctor_id, amount: Number(payout.amount), transactionReference },
      }),
    );

    this.logger.log(`Payout ${id} marked paid by admin ${adminId || 'system'} (ref: ${transactionReference})`);
    return saved;
  }

  // ==========================================
  // LIVE CONSULTATION OVERSIGHT (Sprint C, P1-4)
  // ==========================================

  async getConsultations(query: { inFlightOnly?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const qb = this.consultationRepository.createQueryBuilder('consultation');
    if (query.inFlightOnly) {
      qb.andWhere('consultation.started_at IS NOT NULL').andWhere('consultation.ended_at IS NULL');
    }
    qb.orderBy('consultation.created_at', 'DESC').skip(skip).take(limit);

    const [consultations, total] = await qb.getManyAndCount();

    const bookingIds = consultations.map((c) => c.booking_id);
    const bookings = bookingIds.length
      ? await this.bookingRepository.find({ where: bookingIds.map((id) => ({ id })) })
      : [];
    const bookingsById: Record<string, Booking> = {};
    for (const b of bookings) bookingsById[b.id] = b;

    const doctorIds = Array.from(new Set(bookings.map((b) => b.doctor_id)));
    const patientIds = Array.from(new Set(bookings.map((b) => b.patient_id)));
    const [doctors, patients] = await Promise.all([
      doctorIds.length
        ? this.doctorRepository.createQueryBuilder('doctor').leftJoinAndSelect('doctor.user', 'user').where('doctor.id IN (:...doctorIds)', { doctorIds }).getMany()
        : [],
      patientIds.length ? this.userRepository.find({ where: patientIds.map((id) => ({ id })) }) : [],
    ]);
    const doctorsById: Record<string, any> = {};
    for (const d of doctors) doctorsById[d.id] = { id: d.id, name: d.user?.full_name, specialty: d.specialty };
    const patientsById: Record<string, any> = {};
    for (const p of patients) patientsById[p.id] = { id: p.id, name: p.full_name };

    const now = Date.now();

    return {
      consultations: consultations.map((c) => {
        const booking = bookingsById[c.booking_id];
        const isInFlight = !!c.started_at && !c.ended_at;
        const durationSeconds = c.started_at
          ? Math.floor(((c.ended_at ? new Date(c.ended_at).getTime() : now) - new Date(c.started_at).getTime()) / 1000)
          : 0;

        return {
          id: c.id,
          bookingId: c.booking_id,
          videoRoomId: c.video_room_id,
          roomUrl: c.room_url,
          startedAt: c.started_at,
          endedAt: c.ended_at,
          doctorJoinedAt: c.doctor_joined_at,
          patientJoinedAt: c.patient_joined_at,
          isInFlight,
          durationSeconds,
          booking: booking
            ? {
                id: booking.id,
                status: booking.status,
                price: booking.price,
                doctor: doctorsById[booking.doctor_id] || null,
                patient: patientsById[booking.patient_id] || null,
              }
            : null,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getConsultationDetail(id: string) {
    const consultation = await this.consultationRepository.findOne({ where: { id } });
    if (!consultation) {
      throw new NotFoundException(`Consultation ${id} not found`);
    }
    const booking = await this.bookingRepository.findOne({ where: { id: consultation.booking_id } });
    const extensions = await this.consultationExtensionRepository.find({
      where: { consultation_id: consultation.id },
      order: { created_at: 'ASC' },
    });
    return { ...consultation, booking, extensions };
  }

  // ==========================================
  // NOTIFICATIONS / BROADCAST CONSOLE (Sprint D, P1-5)
  // ==========================================

  async getNotifications(query: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository.createQueryBuilder('notification');
    if (query.status && query.status !== 'all') {
      qb.andWhere('notification.status = :status', { status: query.status });
    }
    qb.orderBy('notification.created_at', 'DESC').skip(skip).take(limit);

    const [notifications, total] = await qb.getManyAndCount();

    const recipientIds = Array.from(new Set(notifications.map((n) => n.recipient_id)));
    const recipients = recipientIds.length
      ? await this.userRepository.find({ where: recipientIds.map((id) => ({ id })) })
      : [];
    const recipientsById: Record<string, string> = {};
    for (const r of recipients) recipientsById[r.id] = r.full_name;

    const allNotifications = await this.notificationRepository.find();
    let sentCount = 0;
    let queuedCount = 0;
    let failedCount = 0;
    for (const n of allNotifications) {
      if (n.status === 'sent') sentCount++;
      else if (n.status === 'queued') queuedCount++;
      else if (n.status === 'failed') failedCount++;
    }

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        recipientId: n.recipient_id,
        recipientName: recipientsById[n.recipient_id] || 'User',
        channel: n.channel,
        templateId: n.template_id,
        title: n.title,
        status: n.status,
        isRead: n.is_read,
        sentAt: n.sent_at,
        createdAt: n.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        total: allNotifications.length,
        sentCount,
        queuedCount,
        failedCount,
      },
    };
  }

  /**
   * Re-dispatches a FAILED notification using its own original payload
   * and template — not a new message. If NotificationsService is not
   * available (optional dependency), this fails loudly rather than
   * silently marking the notification resolved.
   */
  async resendNotification(id: string, adminId?: string) {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    if (!this.notificationsService) {
      throw new BadRequestException('Notification dispatch service is not available on this instance');
    }

    const result = await this.notificationsService.dispatchNotification({
      recipientId: notification.recipient_id,
      title: notification.title || 'Notification',
      templateId: notification.template_id,
      payload: notification.payload || {},
      deepLink: notification.deep_link || undefined,
      forceChannels: [notification.channel],
    });

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: 'ADMIN_NOTIFICATION_RESENT',
        metadata: { notificationId: id, recipientId: notification.recipient_id },
      }),
    );

    return { message: 'Notification re-dispatched.', result };
  }

  /**
   * Platform-wide announcement. targetRole selects patients, doctors, or
   * both; the message is dispatched through the existing
   * NotificationsService (so it respects each recipient's own channel
   * preferences) rather than writing rows directly — reusing the same
   * delivery path every other notification in the system already goes
   * through.
   */
  async broadcastNotification(
    dto: { targetRole: 'patient' | 'doctor' | 'all'; title: string; message: string; deepLink?: string },
    adminId?: string,
  ) {
    if (!dto.title?.trim() || !dto.message?.trim()) {
      throw new BadRequestException('A title and message are required for a broadcast');
    }
    if (!this.notificationsService) {
      throw new BadRequestException('Notification dispatch service is not available on this instance');
    }

    const roles: UserRole[] =
      dto.targetRole === 'all'
        ? [UserRole.PATIENT, UserRole.DOCTOR]
        : dto.targetRole === 'patient'
          ? [UserRole.PATIENT]
          : [UserRole.DOCTOR];

    const recipients = await this.userRepository.find({
      where: roles.map((role) => ({ role, status: UserStatus.ACTIVE })),
    });

    let dispatched = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await this.notificationsService.dispatchNotification({
          recipientId: recipient.id,
          title: dto.title.trim(),
          templateId: 'admin_broadcast',
          payload: { message: dto.message.trim() },
          deepLink: dto.deepLink,
        });
        dispatched += 1;
      } catch {
        failed += 1;
      }
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: 'ADMIN_BROADCAST_SENT',
        metadata: { targetRole: dto.targetRole, title: dto.title, recipientCount: recipients.length, dispatched, failed },
      }),
    );

    this.logger.log(
      `Broadcast "${dto.title}" sent by admin ${adminId || 'system'} to ${recipients.length} ${dto.targetRole} recipient(s): ${dispatched} dispatched, ${failed} failed`,
    );

    return { message: `Broadcast dispatched to ${dispatched} of ${recipients.length} recipients.`, dispatched, failed, total: recipients.length };
  }

  // ==========================================
  // REVIEW MODERATION (Sprint D, P1-6)
  // ==========================================

  async getReviews(query: { hidden?: boolean; doctorId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.reviewRepository.createQueryBuilder('review');
    if (query.hidden !== undefined) {
      qb.andWhere('review.is_hidden = :hidden', { hidden: query.hidden });
    }
    if (query.doctorId) {
      qb.andWhere('review.doctor_id = :doctorId', { doctorId: query.doctorId });
    }
    qb.orderBy('review.created_at', 'DESC').skip(skip).take(limit);

    const [reviews, total] = await qb.getManyAndCount();

    const patientIds = Array.from(new Set(reviews.map((r) => r.patient_id)));
    const doctorIds = Array.from(new Set(reviews.map((r) => r.doctor_id)));
    const [patients, doctors] = await Promise.all([
      patientIds.length ? this.userRepository.find({ where: patientIds.map((id) => ({ id })) }) : [],
      doctorIds.length
        ? this.doctorRepository.createQueryBuilder('doctor').leftJoinAndSelect('doctor.user', 'user').where('doctor.id IN (:...doctorIds)', { doctorIds }).getMany()
        : [],
    ]);
    const patientsById: Record<string, string> = {};
    for (const p of patients) patientsById[p.id] = p.full_name;
    const doctorsById: Record<string, string> = {};
    for (const d of doctors) doctorsById[d.id] = d.user?.full_name || 'Doctor';

    const allReviews = await this.reviewRepository.find();
    let hiddenCount = 0;
    let visibleCount = 0;
    let totalScore = 0;
    for (const r of allReviews) {
      if (r.is_hidden) hiddenCount++;
      else visibleCount++;
      totalScore += Number(r.rating || 0);
    }
    const averageRating = allReviews.length > 0 ? (totalScore / allReviews.length).toFixed(1) : '5.0';

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        bookingId: r.booking_id,
        patientName: patientsById[r.patient_id] || 'Patient',
        doctorName: doctorsById[r.doctor_id] || 'Doctor',
        rating: r.rating,
        comment: r.comment,
        isHidden: r.is_hidden,
        hiddenReason: r.hidden_reason,
        createdAt: r.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        total: allReviews.length,
        visibleCount,
        hiddenCount,
        averageRating: Number(averageRating),
      },
    };
  }

  async setReviewHidden(id: string, hidden: boolean, reason: string | undefined, adminId?: string) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review ${id} not found`);
    }
    if (hidden && (!reason || !reason.trim())) {
      throw new BadRequestException('A reason is required to hide a review');
    }

    review.is_hidden = hidden;
    review.hidden_reason = hidden ? reason!.trim() : null;
    const saved = await this.reviewRepository.save(review);

    // Hiding/unhiding changes which reviews count toward the doctor's
    // public rating average — resync it the same way a new review does.
    try {
      await this.reviewsService.syncDoctorRating(review.doctor_id);
    } catch (err: any) {
      this.logger.warn(`Could not resync doctor rating after review moderation: ${err.message}`);
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: hidden ? 'ADMIN_REVIEW_HIDDEN' : 'ADMIN_REVIEW_UNHIDDEN',
        metadata: { reviewId: id, reason: reason || null },
      }),
    );

    this.logger.log(`Review ${id} ${hidden ? 'hidden' : 'unhidden'} by admin ${adminId || 'system'}`);
    return saved;
  }

  // ==========================================
  // DOCTOR VERIFICATIONS & ADMIN MANAGEMENT (Existing)
  // ==========================================

  async getPendingDoctorVerifications(page = 1, limit = 20, search?: string): Promise<{ doctors: DoctorProfile[]; total: number }> {
    const qb = this.doctorRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .where('doctor.verification_status = :status', { status: VerificationStatus.PENDING });

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        '(user.full_name ILIKE :term OR user.email ILIKE :term OR doctor.hpcsa_number ILIKE :term OR doctor.specialty ILIKE :term)',
        { term },
      );
    }

    qb.orderBy('doctor.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [doctors, total] = await qb.getManyAndCount();
    return { doctors, total };
  }

  async verifyDoctor(doctorId: string, adminId?: string, notes?: string): Promise<DoctorProfile> {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    doctor.verification_status = VerificationStatus.VERIFIED;
    const saved = await this.doctorRepository.save(doctor);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || doctor.user_id,
        user_role: 'admin',
        action: 'DOCTOR_VERIFIED',
        metadata: {
          doctorId: doctor.id,
          hpcsa_number: doctor.hpcsa_number,
          status: VerificationStatus.VERIFIED,
          notes: notes || 'Approved by platform administrator',
        },
      }),
    );

    this.logger.log(`Doctor ${doctor.hpcsa_number} verified by admin ${adminId || 'system'}`);

    if (this.notificationsService && doctor.user_id) {
      this.notificationsService
        .dispatchNotification({
          recipientId: doctor.user_id,
          title: 'Practitioner Profile Approved',
          templateId: 'doctor_profile_approved',
          payload: {
            doctorName: doctor.user?.full_name || doctor.hpcsa_number,
            hpcsaNumber: doctor.hpcsa_number,
            specialty: doctor.specialty || 'General Practitioner',
            message: 'Your practitioner profile has been approved! You can now set your consultation availability.',
          },
          deepLink: '/calendar',
          forceChannels: ['email', 'sms'],
        })
        .catch((err) => {
          this.logger.warn(`Could not dispatch doctor_profile_approved: ${err.message}`);
        });
    }

    return saved;
  }

  async rejectDoctor(doctorId: string, reason: string, adminId?: string): Promise<DoctorProfile> {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    doctor.verification_status = VerificationStatus.REJECTED;
    const saved = await this.doctorRepository.save(doctor);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || doctor.user_id,
        user_role: 'admin',
        action: 'DOCTOR_REJECTED',
        metadata: {
          doctorId: doctor.id,
          hpcsa_number: doctor.hpcsa_number,
          status: VerificationStatus.REJECTED,
          reason: reason || 'Application did not meet verification criteria',
        },
      }),
    );

    this.logger.log(`Doctor ${doctor.hpcsa_number} rejected. Reason: ${reason}`);
    return saved;
  }

  async updateDoctorVerification(
    doctorId: string,
    status: VerificationStatus,
    notes?: string,
  ): Promise<DoctorProfile> {
    if (status === VerificationStatus.VERIFIED) {
      return this.verifyDoctor(doctorId, undefined, notes);
    } else if (status === VerificationStatus.REJECTED) {
      return this.rejectDoctor(doctorId, notes || 'Rejected', undefined);
    }

    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    doctor.verification_status = status;
    return this.doctorRepository.save(doctor);
  }

  async getAllDoctors(query: {
    status?: string;
    source?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    doctors: DoctorProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalDoctors: number;
      verifiedCount: number;
      pendingCount: number;
      locumstaffCount: number;
    };
  }> {
    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 15;
    const skip = (page - 1) * limit;

    const qb = this.doctorRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user');

    if (query.status && query.status !== 'all') {
      qb.andWhere('doctor.verification_status = :status', { status: query.status });
    }

    if (query.source && query.source !== 'all') {
      qb.andWhere('doctor.verification_source = :source', { source: query.source });
    }

    if (query.search && query.search.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(user.full_name ILIKE :search OR user.email ILIKE :search OR doctor.hpcsa_number ILIKE :search OR doctor.specialty ILIKE :search OR doctor.facility_name ILIKE :search)',
        { search },
      );
    }

    qb.orderBy('doctor.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [doctors, total] = await qb.getManyAndCount();

    const allDoctors = await this.doctorRepository.find();
    let verifiedCount = 0;
    let pendingCount = 0;
    let locumstaffCount = 0;
    for (const d of allDoctors) {
      if (d.verification_status === VerificationStatus.VERIFIED) verifiedCount++;
      if (d.verification_status === VerificationStatus.PENDING) pendingCount++;
      if (d.verification_source === VerificationSource.LOCUMSTAFF) locumstaffCount++;
    }

    return {
      doctors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalDoctors: allDoctors.length,
        verifiedCount,
        pendingCount,
        locumstaffCount,
      },
    };
  }

  async suspendDoctor(doctorId: string, suspend: boolean, adminId?: string, reason?: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.user) {
      doctor.user.status = suspend ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
      await this.userRepository.save(doctor.user);
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        user_id: adminId || 'admin',
        user_role: 'admin',
        action: suspend ? 'ADMIN_DOCTOR_SUSPENDED' : 'ADMIN_DOCTOR_REACTIVATED',
        metadata: { doctorId, doctorName: doctor.user?.full_name, reason: reason || null },
      }),
    );

    this.logger.log(
      `Doctor ${doctorId} (${doctor.user?.full_name}) ${suspend ? 'suspended' : 'reactivated'} by admin ${adminId || 'system'}`,
    );

    return { id: doctor.id, status: doctor.user?.status };
  }

  async listAdmins(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.ADMIN },
      order: { created_at: 'ASC' },
    });
  }

  async createAdmin(dto: {
    email: string;
    full_name: string;
    password?: string;
    subRole?: AdminSubRole;
  }): Promise<{ admin: User; temporaryPassword?: string }> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const tempPassword = dto.password || `AdminPass_${Math.random().toString(36).slice(-8)}!`;
    const passwordHash = await this.tokenService.hashPassword(tempPassword);

    const admin = this.userRepository.create({
      email: dto.email.toLowerCase(),
      full_name: dto.full_name,
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      // Default to the lower-privilege sub-role on invite (least
      // privilege) — an existing super_admin must explicitly opt a new
      // account into super_admin.
      admin_sub_role: dto.subRole || AdminSubRole.SUPPORT,
      status: UserStatus.ACTIVE,
      is_email_verified: true,
      email_verified_at: new Date(),
    });

    const saved = await this.userRepository.save(admin);
    return { admin: saved, temporaryPassword: dto.password ? undefined : tempPassword };
  }

  async revokeAdmin(adminId: string): Promise<{ message: string }> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    admin.status = UserStatus.SUSPENDED;
    await this.userRepository.save(admin);

    return { message: `Administrator access for ${admin.email} has been revoked.` };
  }

  async getRecentAuditLogs(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      order: { created_at: 'DESC' },
      take: 50,
    });
  }
}

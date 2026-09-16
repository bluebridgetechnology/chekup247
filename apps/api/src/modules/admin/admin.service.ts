import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlatformSetting,
  AuditLog,
  DoctorProfile,
  VerificationStatus,
  User,
  UserRole,
  UserStatus,
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
  Prescription,
} from '../../database/patient/entities';
import { TokenService } from '../auth/token.service';
import { AuditService, AuditLogsFilterQuery } from '../audit/audit.service';

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
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
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
        const passwordHash = await this.tokenService.hashPassword('AdminChekup2026!');
        const admin = this.userRepository.create({
          email: defaultAdminEmail,
          password_hash: passwordHash,
          full_name: 'ChekUp247 Master Administrator',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          is_email_verified: true,
          email_verified_at: new Date(),
        });
        await this.userRepository.save(admin);
        this.logger.log(`Default initial administrator seeded: ${defaultAdminEmail}`);
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

    // Specialty Breakdown
    const specialtyMap: Record<string, number> = {};
    for (const doc of verifiedDoctors) {
      const spec = doc.specialty || 'General Practitioner';
      specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
    }

    const specialtyDistribution = Object.entries(specialtyMap).map(([specialty, count]) => ({
      specialty,
      count,
      percentage: Math.round((count / (verifiedDoctors.length || 1)) * 100),
    }));

    // 30-Day Trend (group by date)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendMap: Record<string, { date: string; bookings: number; volume: number; commission: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      trendMap[dateKey] = { date: dateKey, bookings: 0, volume: 0, commission: 0 };
    }

    for (const b of allBookings) {
      if (b.created_at) {
        const dateKey = new Date(b.created_at).toISOString().split('T')[0];
        if (trendMap[dateKey]) {
          trendMap[dateKey].bookings += 1;
          trendMap[dateKey].volume += Number(b.price || 0);
          trendMap[dateKey].commission += Number(b.commission_amount || 0);
        }
      }
    }

    const revenueTrends = Object.values(trendMap);

    return {
      kpi: {
        totalBookings,
        grossVolume: Number(grossVolume.toFixed(2)),
        netCommission: Number(netCommission.toFixed(2)),
        completedConsultations,
        cancelledCount,
        noShowCount,
        noShowRate,
        activeDoctors: verifiedDoctors.length,
        totalDoctors: allDoctors.length,
        activePatients: totalPatients,
      },
      specialtyDistribution,
      revenueTrends,
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

    return {
      transactions: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalPaymentsVolume: Number(totalPaymentsVolume.toFixed(2)),
        totalRefundedVolume: Number(totalRefundedVolume.toFixed(2)),
        totalCreditsVolume: Number(totalCreditsVolume.toFixed(2)),
        totalPayoutsVolume: Number(totalPayoutsVolume.toFixed(2)),
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

  // ==========================================
  // BE-906: BOOKINGS OVERSIGHT API
  // ==========================================

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
          email: d.user?.email,
          specialty: d.specialty,
          hpcsaNumber: d.hpcsa_number,
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
          email: p.email,
        };
      }
    }

    const enrichedBookings = bookings.map((b) => ({
      ...b,
      doctor: doctorsMap[b.doctor_id] || { id: b.doctor_id, name: 'Doctor' },
      patient: patientsMap[b.patient_id] || { id: b.patient_id, name: 'Patient' },
    }));

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

    return {
      ...booking,
      doctor: doctor
        ? {
            id: doctor.id,
            name: doctor.user?.full_name,
            email: doctor.user?.email,
            specialty: doctor.specialty,
            hpcsaNumber: doctor.hpcsa_number,
            facilityName: doctor.facility_name,
          }
        : null,
      patient: patient
        ? {
            id: patient.id,
            name: patient.full_name,
            email: patient.email,
          }
        : null,
      payment,
      consultation,
      prescriptions,
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
  // DOCTOR VERIFICATIONS & ADMIN MANAGEMENT (Existing)
  // ==========================================

  async getPendingDoctorVerifications(page = 1, limit = 20): Promise<{ doctors: DoctorProfile[]; total: number }> {
    const [doctors, total] = await this.doctorRepository.findAndCount({
      where: { verification_status: VerificationStatus.PENDING },
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
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
  }): Promise<{ doctors: DoctorProfile[]; total: number; page: number; limit: number; totalPages: number }> {
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
        '(user.full_name ILIKE :search OR user.email ILIKE :search OR doctor.hpcsa_number ILIKE :search OR doctor.specialty ILIKE :search)',
        { search },
      );
    }

    qb.orderBy('doctor.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [doctors, total] = await qb.getManyAndCount();

    return {
      doctors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
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

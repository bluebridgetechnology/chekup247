import {
  Injectable,
  ConflictException,
  NotFoundException,
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
} from '../../database/operational/entities';
import { TokenService } from '../auth/token.service';

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
    private readonly tokenService: TokenService,
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

  async getPlatformSettings(): Promise<PlatformSetting | null> {
    return this.settingsRepository.findOne({ where: {} });
  }

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

    // Audit log
    const audit = this.auditLogRepository.create({
      user_id: adminId || doctor.user_id,
      user_role: 'admin',
      action: 'DOCTOR_VERIFIED',
      metadata: {
        doctorId: doctor.id,
        hpcsa_number: doctor.hpcsa_number,
        status: VerificationStatus.VERIFIED,
        notes: notes || 'Approved by platform administrator',
      },
    });
    await this.auditLogRepository.save(audit);

    this.logger.log(`Doctor ${doctor.hpcsa_number} successfully verified by admin ${adminId || 'system'}`);
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

    // Audit log
    const audit = this.auditLogRepository.create({
      user_id: adminId || doctor.user_id,
      user_role: 'admin',
      action: 'DOCTOR_REJECTED',
      metadata: {
        doctorId: doctor.id,
        hpcsa_number: doctor.hpcsa_number,
        status: VerificationStatus.REJECTED,
        reason: reason || 'Application did not meet verification criteria',
      },
    });
    await this.auditLogRepository.save(audit);


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

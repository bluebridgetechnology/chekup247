import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  PlatformSetting,
  AuditLog,
  DoctorProfile,
  User,
  Payout,
  AvailabilitySlot,
  VerificationStatus,
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
import { AuditService } from '../audit/audit.service';

describe('AdminService', () => {
  let service: AdminService;
  let bookingRepo: any;
  let paymentRepo: any;
  let creditRepo: any;
  let doctorRepo: any;
  let userRepo: any;
  let payoutRepo: any;
  let slotRepo: any;
  let auditLogRepo: any;
  let auditService: any;

  beforeEach(async () => {
    bookingRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'b-1',
          status: BookingStatus.COMPLETED,
          price: 850,
          commission_amount: 127.5,
          doctor_id: 'doc-1',
          patient_id: 'pat-1',
          created_at: new Date(),
        },
        {
          id: 'b-2',
          status: BookingStatus.NO_SHOW,
          price: 900,
          commission_amount: 135,
          doctor_id: 'doc-1',
          patient_id: 'pat-2',
          created_at: new Date(),
        },
      ]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    paymentRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'pay-1',
          amount: 850,
          status: PaymentRecordStatus.SUCCESS,
          provider: 'paystack',
          provider_ref: 'ref-1',
          booking_id: 'b-1',
          created_at: new Date(),
        },
      ]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    creditRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => ({ id: 'c-1', ...dto, created_at: new Date() })),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };

    doctorRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'doc-1',
          specialty: 'General Practitioner',
          verification_status: VerificationStatus.VERIFIED,
          user: { full_name: 'Dr. Thabo Molefe' },
        },
      ]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    userRepo = {
      count: jest.fn().mockResolvedValue(10),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    payoutRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    slotRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    auditLogRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
      find: jest.fn().mockResolvedValue([]),
    };

    auditService = {
      getAuditLogs: jest.fn().mockResolvedValue({ logs: [], total: 0, page: 1, limit: 20, totalPages: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(PlatformSetting, 'operational'), useValue: {} },
        { provide: getRepositoryToken(AuditLog, 'operational'), useValue: auditLogRepo },
        { provide: getRepositoryToken(DoctorProfile, 'operational'), useValue: doctorRepo },
        { provide: getRepositoryToken(User, 'operational'), useValue: userRepo },
        { provide: getRepositoryToken(Payout, 'operational'), useValue: payoutRepo },
        { provide: getRepositoryToken(AvailabilitySlot, 'operational'), useValue: slotRepo },
        { provide: getRepositoryToken(Booking, 'patient'), useValue: bookingRepo },
        { provide: getRepositoryToken(Payment, 'patient'), useValue: paymentRepo },
        { provide: getRepositoryToken(WalletCredit, 'patient'), useValue: creditRepo },
        { provide: getRepositoryToken(Consultation, 'patient'), useValue: {} },
        { provide: getRepositoryToken(Prescription, 'patient'), useValue: {} },
        { provide: TokenService, useValue: { hashPassword: jest.fn() } },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getAnalytics (BE-904)', () => {
    it('should aggregate gross volume, net commission, no-show rate, and active counts', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.kpi.totalBookings).toBe(2);
      expect(analytics.kpi.completedConsultations).toBe(1);
      expect(analytics.kpi.noShowCount).toBe(1);
      expect(analytics.kpi.noShowRate).toBe(50);
      expect(analytics.kpi.activeDoctors).toBe(1);
      expect(analytics.kpi.activePatients).toBe(10);
      expect(analytics.specialtyDistribution).toHaveLength(1);
      expect(analytics.specialtyDistribution[0].specialty).toBe('General Practitioner');
    });
  });

  describe('getTransactions & export (BE-905)', () => {
    it('should return unified financial ledger with summary totals', async () => {
      const result = await service.getTransactions({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].type).toBe('payment');
      expect(result.summary.totalPaymentsVolume).toBe(850);
    });

    it('should export CSV representation of transactions', async () => {
      const csv = await service.exportTransactionsCsv({});

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Transaction ID,Type,Amount (ZAR)');
      expect(csv).toContain('850.00');
    });
  });

  describe('resolveDisputeRefund (BE-908)', () => {
    it('should throw BadRequestException if justification reason is missing', async () => {
      await expect(
        service.resolveDisputeRefund({ bookingId: 'b-1', reason: '' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolveDisputeRefund({ bookingId: 'b-999', reason: 'Patient complaint' }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should process manual refund, update records, and create audit log', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'b-1',
        price: 850,
        patient_id: 'pat-1',
        slot_id: 'slot-1',
        status: BookingStatus.COMPLETED,
      });
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-1',
        status: PaymentRecordStatus.SUCCESS,
      });

      const result = await service.resolveDisputeRefund(
        { bookingId: 'b-1', reason: 'Doctor technical failure' },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(850);
      expect(paymentRepo.save).toHaveBeenCalled();
      expect(slotRepo.update).toHaveBeenCalledWith({ id: 'slot-1' }, { is_booked: false });
      expect(auditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('resolveDisputeCredit (BE-908)', () => {
    it('should issue platform credit to patient wallet with audit trail', async () => {
      const result = await service.resolveDisputeCredit(
        { patientId: 'pat-1', amount: 300, reason: 'Goodwill compensation' },
        'admin-1',
      );

      expect(result.success).toBe(true);
      expect(result.credit.amount).toBe(300);
      expect(creditRepo.save).toHaveBeenCalled();
      expect(auditLogRepo.save).toHaveBeenCalled();
    });
  });
});

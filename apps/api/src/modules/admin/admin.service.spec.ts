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
  ConsultationExtension,
  Prescription,
  Dispute,
  Review,
  Notification,
} from '../../database/patient/entities';
import { ReviewsService } from '../reviews/reviews.service';
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
  let disputeRepo: any;
  let reviewRepo: any;
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
      find: jest.fn().mockResolvedValue([
        { id: 'pat-1', full_name: 'Lindiwe Nkosi' },
        { id: 'pat-2', full_name: 'Karabo Molefe' },
      ]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    payoutRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    slotRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    disputeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: d.id || 'dis-1', ...d })),
      create: jest.fn().mockImplementation((dto) => ({ id: 'dis-1', ...dto })),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    reviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
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
        { provide: getRepositoryToken(Consultation, 'patient'), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Prescription, 'patient'), useValue: {} },
        { provide: getRepositoryToken(Dispute, 'patient'), useValue: disputeRepo },
        { provide: getRepositoryToken(Review, 'patient'), useValue: reviewRepo },
        { provide: getRepositoryToken(ConsultationExtension, 'patient'), useValue: {} },
        { provide: getRepositoryToken(Notification, 'patient'), useValue: {} },
        { provide: TokenService, useValue: { hashPassword: jest.fn() } },
        { provide: AuditService, useValue: auditService },
        { provide: ReviewsService, useValue: { syncDoctorRating: jest.fn().mockResolvedValue({ ratingAvg: 0, reviewsCount: 0 }) } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getAnalytics (BE-904)', () => {
    it('should aggregate gross volume, net commission, no-show rate, and active counts', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.kpis.completedCount).toBe(1);
      expect(analytics.kpis.noShowCount).toBe(1);
      expect(analytics.kpis.noShowRate).toBe('50%');
      expect(analytics.kpis.activeDoctorsCount).toBe(1);
      expect(analytics.kpis.verifiedPatientsCount).toBe(10);
      expect(analytics.specialtyDistribution).toHaveLength(1);
      expect(analytics.specialtyDistribution[0].specialty).toBe('General Practitioner');
      expect(analytics.systemHealth).toBeDefined();
      expect(Array.isArray(analytics.recentActivity)).toBe(true);
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

  describe('Dispute lifecycle (Sprint B, P1-1)', () => {
    it('createDispute should reject when the booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createDispute({ bookingId: 'missing', category: 'billing', reason: 'Wrong amount charged' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('createDispute should reject an empty reason', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b-1', patient_id: 'pat-1' });

      await expect(
        service.createDispute({ bookingId: 'b-1', category: 'billing', reason: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createDispute should open a dispute with status OPEN and write an audit log', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b-1', patient_id: 'pat-1' });

      const dispute = await service.createDispute({
        bookingId: 'b-1',
        category: 'billing',
        reason: 'Charged twice for the same consultation',
        raisedByUserId: 'pat-1',
      });

      expect(dispute.status).toBe('open');
      expect(disputeRepo.save).toHaveBeenCalled();
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('assignDispute should move an OPEN dispute to INVESTIGATING and record the assignee', async () => {
      disputeRepo.findOne.mockResolvedValue({ id: 'dis-1', status: 'open', booking_id: 'b-1' });

      const result = await service.assignDispute('dis-1', 'admin-1');

      expect(result.assigned_admin_id).toBe('admin-1');
      expect(result.status).toBe('investigating');
      expect(disputeRepo.save).toHaveBeenCalled();
    });

    it('resolveDisputeLifecycle should reject when notes are missing', async () => {
      disputeRepo.findOne.mockResolvedValue({ id: 'dis-1', booking_id: 'b-1', status: 'investigating' });
      bookingRepo.findOne.mockResolvedValue({ id: 'b-1', patient_id: 'pat-1', price: 500 });

      await expect(
        service.resolveDisputeLifecycle('dis-1', { resolutionType: 'no_action' as any, notes: '' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resolveDisputeLifecycle with no_action should mark the dispute REJECTED without touching payments', async () => {
      disputeRepo.findOne.mockResolvedValue({ id: 'dis-1', booking_id: 'b-1', status: 'investigating' });
      bookingRepo.findOne.mockResolvedValue({ id: 'b-1', patient_id: 'pat-1', price: 500 });

      const result = await service.resolveDisputeLifecycle(
        'dis-1',
        { resolutionType: 'no_action' as any, notes: 'Evidence does not support the claim' },
        'admin-1',
      );

      expect(result.status).toBe('rejected');
      expect(result.resolution_type).toBe('no_action');
      expect(paymentRepo.save).not.toHaveBeenCalled();
      expect(creditRepo.save).not.toHaveBeenCalled();
    });

    it('resolveDisputeLifecycle with credit should reject a non-positive amount', async () => {
      disputeRepo.findOne.mockResolvedValue({ id: 'dis-1', booking_id: 'b-1', status: 'investigating' });
      bookingRepo.findOne.mockResolvedValue({ id: 'b-1', patient_id: 'pat-1', price: 500 });

      await expect(
        service.resolveDisputeLifecycle(
          'dis-1',
          { resolutionType: 'credit' as any, amount: 0, notes: 'Approved' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payout management (Sprint C, P1-2)', () => {
    it('approvePayout should reject a payout that is already paid', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'paid' });

      await expect(service.approvePayout('po-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('approvePayout should clear a hold and set status to pending', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'hold', hold_reason: 'Dispute pending' });

      const result = await service.approvePayout('po-1', 'admin-1');

      expect(result.status).toBe('pending');
      expect(result.hold_reason).toBeNull();
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('holdPayout should require a reason', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'pending' });

      await expect(service.holdPayout('po-1', '', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('holdPayout should reject a payout that is already paid', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'paid' });

      await expect(service.holdPayout('po-1', 'Under investigation', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('holdPayout should set status HOLD with the given reason', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'pending' });

      const result = await service.holdPayout('po-1', 'Under investigation', 'admin-1');

      expect(result.status).toBe('hold');
      expect(result.hold_reason).toBe('Under investigation');
    });

    it('markPayoutPaid should require a transaction reference', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'pending' });

      await expect(service.markPayoutPaid('po-1', '', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('markPayoutPaid should reject a payout that is already paid', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'paid' });

      await expect(service.markPayoutPaid('po-1', 'EFT-001', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('markPayoutPaid should set status PAID and store the reference', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'po-1', status: 'pending' });

      const result = await service.markPayoutPaid('po-1', 'EFT-001', 'admin-1');

      expect(result.status).toBe('paid');
      expect(result.transaction_reference).toBe('EFT-001');
      expect(auditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('Patient management (Sprint B, P1-3)', () => {
    it('suspendPatient should reject an unknown patient', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.suspendPatient('pat-x', true, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('suspendPatient(true) should set status SUSPENDED and write an audit log', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'pat-1', role: 'patient', status: 'active' });
      userRepo.save = jest.fn().mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.suspendPatient('pat-1', true, 'admin-1', 'Abusive behaviour reported');

      expect(result.status).toBe('suspended');
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('suspendPatient(false) should reactivate a suspended patient', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'pat-1', role: 'patient', status: 'suspended' });
      userRepo.save = jest.fn().mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.suspendPatient('pat-1', false, 'admin-1');

      expect(result.status).toBe('active');
    });

    it('deletePatient should reject an unknown patient', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.deletePatient('pat-x', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('deletePatient should soft-delete: BANNED status with PII scrubbed, not a hard delete', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'pat-1',
        role: 'patient',
        status: 'active',
        full_name: 'Real Patient Name',
        phone: '+27821234567',
        avatar_url: 'https://example.com/avatar.jpg',
      });
      const saveSpy = jest.fn().mockImplementation((u: any) => Promise.resolve(u));
      userRepo.save = saveSpy;

      const result = await service.deletePatient('pat-1', 'admin-1', 'GDPR/POPIA erasure request');

      expect(result.message).toContain('retained');
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'banned', full_name: 'Deleted Patient', phone: null, avatar_url: null }),
      );
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('exportPatientPopiaData should reject an unknown patient', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.exportPatientPopiaData('pat-x', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});

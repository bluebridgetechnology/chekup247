import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus, PaymentStatus, Payment } from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User, PlatformSetting } from '../../database/operational/entities';
import { PaymentsService } from '../payments/payments.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUES } from '../queues/queue.constants';

describe('BookingsService (Saga & Cross-DB)', () => {
  let service: BookingsService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockOperationalDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockPatientDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockBookingRepository = {
    create: jest.fn((dto) => ({ ...dto, id: 'booking-uuid-123' })),
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: 'booking-uuid-123' })),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPaymentRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockSlotRepository = {
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDoctorRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockPlatformSettingRepository = {
    findOne: jest.fn().mockResolvedValue({
      late_cancellation_deduction_percent: 30.0,
      commission_percent: 15.0,
    }),
  };

  const mockPaymentsService = {
    processRefund: jest.fn().mockResolvedValue({ success: true, refund_method: 'paystack' }),
    addWalletCredit: jest.fn().mockResolvedValue({ id: 'credit-1', amount: 700 }),
  };

  const mockDlqQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getWaiting: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBookingRepository.save = jest.fn((entity) =>
      Promise.resolve({ ...entity, id: entity.id || 'booking-uuid-123' }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking, 'patient'), useValue: mockBookingRepository },
        { provide: getRepositoryToken(Payment, 'patient'), useValue: mockPaymentRepository },
        { provide: getRepositoryToken(AvailabilitySlot, 'operational'), useValue: mockSlotRepository },
        { provide: getRepositoryToken(DoctorProfile, 'operational'), useValue: mockDoctorRepository },
        { provide: getRepositoryToken(User, 'operational'), useValue: mockUserRepository },
        { provide: getRepositoryToken(PlatformSetting, 'operational'), useValue: mockPlatformSettingRepository },
        { provide: 'operationalDataSource', useValue: mockOperationalDataSource },
        { provide: 'patientDataSource', useValue: mockPatientDataSource },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: getQueueToken(QUEUES.BOOKING_DLQ), useValue: mockDlqQueue },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBookingSaga', () => {
    it('should successfully execute Saga: lock VPS slot and write RDS booking', async () => {
      const slot = {
        id: 'slot-1',
        doctor_id: 'doc-1',
        start_time: new Date(Date.now() + 86400000),
        end_time: new Date(Date.now() + 90000000),
        is_booked: false,
        is_locked: false,
      };

      const doctor = {
        id: 'doc-1',
        rate_per_hour: 850.0,
        specialty: 'General Practitioner',
        hpcsa_number: 'MP0123456',
        user: { full_name: 'Dr. Thabo Molefe', email: 'thabo@example.com' },
      };

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(slot),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);
      mockQueryRunner.manager.findOne.mockResolvedValue(doctor);
      mockQueryRunner.manager.save.mockResolvedValue({ ...slot, is_booked: true });

      const result = await service.createBookingSaga('patient-1', { slotId: 'slot-1' });

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockBookingRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('booking-uuid-123');
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.payment_status).toBe(PaymentStatus.UNPAID);
      expect(result.price).toBe(850.0);
    });

    it('should execute compensating rollback on VPS if AWS RDS write fails', async () => {
      const slot = {
        id: 'slot-1',
        doctor_id: 'doc-1',
        start_time: new Date(Date.now() + 86400000),
        end_time: new Date(Date.now() + 90000000),
        is_booked: false,
        is_locked: false,
      };

      const doctor = {
        id: 'doc-1',
        rate_per_hour: 850.0,
        user: { full_name: 'Dr. Thabo Molefe' },
      };

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(slot),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);
      mockQueryRunner.manager.findOne.mockResolvedValue(doctor);
      mockQueryRunner.manager.save.mockResolvedValue({ ...slot, is_booked: true });

      // RDS write fails
      mockBookingRepository.save.mockRejectedValue(new Error('RDS Database Connection Lost'));

      await expect(
        service.createBookingSaga('patient-1', { slotId: 'slot-1' }),
      ).rejects.toThrow('Unable to complete booking reservation');

      // Verify compensating rollback on VPS Postgres
      expect(mockSlotRepository.update).toHaveBeenCalledWith(
        { id: 'slot-1' },
        { is_booked: false },
      );
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking with 100% refund when >= 24h away', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours away
      const booking = {
        id: 'booking-1',
        patient_id: 'patient-1',
        doctor_id: 'doc-1',
        slot_id: 'slot-1',
        status: BookingStatus.CONFIRMED,
        payment_status: PaymentStatus.HELD,
        price: 1000,
      };

      const slot = {
        id: 'slot-1',
        doctor_id: 'doc-1',
        start_time: futureDate,
        is_booked: true,
      };

      mockBookingRepository.findOne.mockResolvedValue(booking);
      mockSlotRepository.findOne.mockResolvedValue(slot);

      const res = await service.cancelBooking('booking-1', 'patient-1', 'Emergency', 'refund');

      expect(res.success).toBe(true);
      expect(res.is_over_24h).toBe(true);
      expect(res.deduction_percent).toBe(0);
      expect(res.refund_amount).toBe(1000);
      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(slot.is_booked).toBe(false);
      expect(mockPaymentsService.processRefund).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        amount: 1000,
        reason: 'Emergency',
        refundToWallet: false,
      });
    });

    it('should apply late cancellation deduction (30%) when < 24h away', async () => {
      const nearFutureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours away (< 24h)
      const booking = {
        id: 'booking-2',
        patient_id: 'patient-1',
        doctor_id: 'doc-1',
        slot_id: 'slot-2',
        status: BookingStatus.CONFIRMED,
        payment_status: PaymentStatus.HELD,
        price: 1000,
      };

      const slot = {
        id: 'slot-2',
        doctor_id: 'doc-1',
        start_time: nearFutureDate,
        is_booked: true,
      };

      mockBookingRepository.findOne.mockResolvedValue(booking);
      mockSlotRepository.findOne.mockResolvedValue(slot);

      const res = await service.cancelBooking('booking-2', 'patient-1', 'Traffic', 'credit');

      expect(res.success).toBe(true);
      expect(res.is_over_24h).toBe(false);
      expect(res.deduction_percent).toBe(30);
      expect(res.deduction_amount).toBe(300);
      expect(res.refund_amount).toBe(700);
      expect(res.refund_method).toBe('wallet');
      expect(mockPaymentsService.addWalletCredit).toHaveBeenCalledWith(
        'patient-1',
        700,
        'Traffic',
        'booking-2',
      );
      expect(slot.is_booked).toBe(false);
    });
  });

  describe('rescheduleBooking', () => {
    it('should atomically swap slots when rescheduling >= 24h away', async () => {
      const oldFutureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const newFutureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const booking = {
        id: 'booking-1',
        patient_id: 'patient-1',
        doctor_id: 'doc-1',
        slot_id: 'old-slot-1',
        status: BookingStatus.CONFIRMED,
        payment_status: PaymentStatus.HELD,
        price: 1000,
      };

      const oldSlot = {
        id: 'old-slot-1',
        doctor_id: 'doc-1',
        start_time: oldFutureDate,
        is_booked: true,
      };

      const newSlot = {
        id: 'new-slot-2',
        doctor_id: 'doc-1',
        start_time: newFutureDate,
        is_booked: false,
        is_locked: false,
        doctor: { user: { full_name: 'Dr. Test' } },
      };

      mockBookingRepository.findOne.mockResolvedValue(booking);
      mockSlotRepository.findOne
        .mockResolvedValueOnce(oldSlot)
        .mockResolvedValueOnce(newSlot);

      const res = await service.rescheduleBooking('booking-1', 'patient-1', {
        newSlotId: 'new-slot-2',
        reason: 'Shift clash',
      });

      expect(booking.slot_id).toBe('new-slot-2');
      expect(oldSlot.is_booked).toBe(false);
      expect(newSlot.is_booked).toBe(true);
      expect(res.id).toBe('booking-1');
    });
  });

  describe('reconcileDatabaseDrift', () => {
    it('should detect orphaned slots and release them', async () => {
      mockSlotRepository.find.mockResolvedValue([
        { id: 'orphaned-slot-1', is_booked: true },
      ]);
      mockBookingRepository.find.mockResolvedValue([]); // No booking exists in RDS

      const res = await service.reconcileDatabaseDrift();

      expect(res.orphaned_slots_fixed).toBe(1);
      expect(mockSlotRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'orphaned-slot-1', is_booked: false }),
      );
    });
  });
});

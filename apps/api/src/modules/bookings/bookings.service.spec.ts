import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus, PaymentStatus, Payment } from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User } from '../../database/operational/entities';
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

  const mockPaymentsService = {
    processRefund: jest.fn().mockResolvedValue({ success: true }),
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
    it('should cancel booking, trigger refund, and release availability slot', async () => {
      const booking = {
        id: 'booking-1',
        patient_id: 'patient-1',
        doctor_id: 'doc-1',
        slot_id: 'slot-1',
        status: BookingStatus.CONFIRMED,
        payment_status: PaymentStatus.HELD,
      };

      mockBookingRepository.findOne.mockResolvedValue(booking);

      const res = await service.cancelBooking('booking-1', 'patient-1', 'Emergency');

      expect(res.success).toBe(true);
      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(mockPaymentsService.processRefund).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        reason: 'Emergency',
        refundToWallet: true,
      });
      expect(mockSlotRepository.update).toHaveBeenCalledWith(
        { id: 'slot-1' },
        { is_booked: false },
      );
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

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus, PaymentStatus, Payment } from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User, PlatformSetting } from '../../database/operational/entities';
import { Consultation, ConsultationExtension } from '../../database/patient/entities';
import { PaymentsService } from '../payments/payments.service';
import { getQueueToken } from '@nestjs/bullmq';
import { TokenService } from '../auth/token.service';
import { signJoinLinkToken } from '../../common/utils/join-link';
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

  const mockConsultationRepository = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockExtensionRepository = {
    find: jest.fn().mockResolvedValue([]),
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

  const mockTokenService = {
    generateAccessToken: jest.fn().mockReturnValue('guest-access-token'),
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
        { provide: getRepositoryToken(Consultation, 'patient'), useValue: mockConsultationRepository },
        { provide: getRepositoryToken(ConsultationExtension, 'patient'), useValue: mockExtensionRepository },
        { provide: getRepositoryToken(AvailabilitySlot, 'operational'), useValue: mockSlotRepository },
        { provide: getRepositoryToken(DoctorProfile, 'operational'), useValue: mockDoctorRepository },
        { provide: getRepositoryToken(User, 'operational'), useValue: mockUserRepository },
        { provide: getRepositoryToken(PlatformSetting, 'operational'), useValue: mockPlatformSettingRepository },
        { provide: 'operationalDataSource', useValue: mockOperationalDataSource },
        { provide: 'patientDataSource', useValue: mockPatientDataSource },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: getQueueToken(QUEUES.BOOKING_DLQ), useValue: mockDlqQueue },
        { provide: TokenService, useValue: mockTokenService },
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
      // 1-hour slot at R850 per 30 minutes
      expect(result.price).toBe(1700.0);
    });

    it('charges the rate per 30 minutes in proportion to the slot length', async () => {
      const base = Date.now() + 86400000;
      const makeSlot = (minutes: number) => ({
        id: 'slot-2',
        doctor_id: 'doc-1',
        start_time: new Date(base),
        end_time: new Date(base + minutes * 60000),
        is_booked: false,
        is_locked: false,
      });
      const doctor = {
        id: 'doc-1',
        rate_per_hour: 800.0,
        verification_source: 'locumstaff',
        specialty: 'General Practitioner',
        hpcsa_number: 'MP0123456',
        user: { full_name: 'Dr. Thabo Molefe', email: 'thabo@example.com' },
      };
      for (const [minutes, expected] of [[15, 850], [30, 850], [60, 1700], [45, 1275]] as const) {
        const slot = makeSlot(minutes);
        mockQueryRunner.manager.createQueryBuilder.mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(slot),
        });
        mockQueryRunner.manager.findOne.mockResolvedValue(doctor);
        mockQueryRunner.manager.save.mockResolvedValue({ ...slot, is_booked: true });
        const result = await service.createBookingSaga('patient-1', { slotId: 'slot-2' });
        // LocumStaff doctors always use the platform rate (default 850 here), not their stored rate
        expect(result.price).toBe(expected);
      }
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
        end_time: new Date(newFutureDate.getTime() + 30 * 60 * 1000),
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

    it('should reject rescheduling to a slot starting in less than 15 minutes', async () => {
      const oldFutureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const almostOverStart = new Date(Date.now() + 10 * 60 * 1000); // starts in 10 min
      const almostOverEnd = new Date(Date.now() + 40 * 60 * 1000);

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
        start_time: almostOverStart,
        end_time: almostOverEnd,
        is_booked: false,
        is_locked: false,
        doctor: { user: { full_name: 'Dr. Test' } },
      };

      mockBookingRepository.findOne.mockResolvedValue(booking);
      mockSlotRepository.findOne
        .mockResolvedValueOnce(oldSlot)
        .mockResolvedValueOnce(newSlot);

      await expect(
        service.rescheduleBooking('booking-1', 'patient-1', {
          newSlotId: 'new-slot-2',
          reason: 'Shift clash',
        }),
      ).rejects.toThrow('starting in less than 15 minutes');
    });
  });

  describe('slot bookability (booking lead time)', () => {
    it('should allow booking a slot that starts after the lead time', async () => {
      const slot = {
        id: 'slot-started',
        doctor_id: 'doc-1',
        start_time: new Date(Date.now() + 20 * 60 * 1000), // starts in 20 min
        end_time: new Date(Date.now() + 50 * 60 * 1000),
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

      const result = await service.createBookingSaga('patient-1', { slotId: 'slot-started' });

      expect(result.status).toBe(BookingStatus.PENDING);
    });

    it('should reject booking a slot that starts within the lead time, even if it has time left', async () => {
      const slot = {
        id: 'slot-expiring',
        doctor_id: 'doc-1',
        start_time: new Date(Date.now() - 2 * 60 * 1000), // started 2 min ago
        end_time: new Date(Date.now() + 58 * 60 * 1000), // a long slot with 58 min left
        is_booked: false,
        is_locked: false,
      };

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(slot),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.createBookingSaga('patient-1', { slotId: 'slot-expiring' }),
      ).rejects.toThrow('bookings close 15 minutes before the start');
    });
  });

  describe('slot holds', () => {
    const TOKEN = 'a'.repeat(32);
    const OTHER = 'b'.repeat(32);
    const mkSlot = (over: any = {}) => ({
      id: 'slot-1',
      doctor_id: 'doc-1',
      start_time: new Date(Date.now() + 60 * 60 * 1000),
      end_time: new Date(Date.now() + 90 * 60 * 1000),
      is_booked: false,
      is_locked: false,
      hold_token: null,
      hold_expires_at: null,
      ...over,
    });
    const lockQb = (slot: any) => ({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(slot),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    });

    it('holds an open slot for the configured minutes and returns a token', async () => {
      const slot = mkSlot();
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      mockPlatformSettingRepository.findOne.mockResolvedValue({ slot_hold_minutes: 10, booking_lead_minutes: 15 });
      const res = await service.holdSlot('slot-1');
      expect(res.holdToken).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
      expect(res.holdMinutes).toBe(10);
      const msFromNow = new Date(res.expiresAt).getTime() - Date.now();
      expect(msFromNow).toBeGreaterThan(9 * 60 * 1000);
      expect(msFromNow).toBeLessThanOrEqual(10 * 60 * 1000);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({ hold_token: res.holdToken }));
    });

    it('never holds past the slot start', async () => {
      const slot = mkSlot({ start_time: new Date(Date.now() + 16 * 60 * 1000), end_time: new Date(Date.now() + 46 * 60 * 1000) });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      mockPlatformSettingRepository.findOne.mockResolvedValue({ slot_hold_minutes: 30, booking_lead_minutes: 15 });
      const res = await service.holdSlot('slot-1');
      expect(new Date(res.expiresAt).getTime()).toBeLessThanOrEqual(new Date(slot.start_time).getTime());
    });

    it('rejects a slot held by someone else', async () => {
      const slot = mkSlot({ hold_token: OTHER, hold_expires_at: new Date(Date.now() + 5 * 60 * 1000) });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      await expect(service.holdSlot('slot-1', TOKEN)).rejects.toThrow('Someone else is booking this time');
    });

    it('lets the same client re-request its own hold without extending it', async () => {
      const expiry = new Date(Date.now() + 4 * 60 * 1000);
      const slot = mkSlot({ hold_token: TOKEN, hold_expires_at: expiry });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      const res = await service.holdSlot('slot-1', TOKEN);
      expect(res.expiresAt).toBe(expiry.toISOString());
    });

    it('takes over an expired hold', async () => {
      const slot = mkSlot({ hold_token: OTHER, hold_expires_at: new Date(Date.now() - 1000) });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      mockPlatformSettingRepository.findOne.mockResolvedValue({ slot_hold_minutes: 10, booking_lead_minutes: 15 });
      const res = await service.holdSlot('slot-1', TOKEN);
      expect(res.holdToken).toBe(TOKEN);
    });

    it('rejects booked slots and slots inside the lead time', async () => {
      mockPlatformSettingRepository.findOne.mockResolvedValue({ slot_hold_minutes: 10, booking_lead_minutes: 15 });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(mkSlot({ is_booked: true })));
      await expect(service.holdSlot('slot-1')).rejects.toThrow('just been taken');
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        lockQb(mkSlot({ start_time: new Date(Date.now() + 5 * 60 * 1000) })),
      );
      await expect(service.holdSlot('slot-1')).rejects.toThrow('bookings close 15 minutes before the start');
    });

    it('booking is rejected when another patient holds the slot', async () => {
      const slot = mkSlot({ hold_token: OTHER, hold_expires_at: new Date(Date.now() + 5 * 60 * 1000) });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      await expect(
        service.createBookingSaga('patient-1', { slotId: 'slot-1', holdToken: TOKEN }),
      ).rejects.toThrow('Someone else is booking this time');
    });

    it('the holder can still book after the lead-time cutoff passed, until the hold expires', async () => {
      // starts in 8 min: inside the 15-min lead, but this patient holds it
      const slot = mkSlot({
        start_time: new Date(Date.now() + 8 * 60 * 1000),
        end_time: new Date(Date.now() + 38 * 60 * 1000),
        hold_token: TOKEN,
        hold_expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      mockQueryRunner.manager.findOne.mockResolvedValue({ id: 'doc-1', rate_per_hour: 850, user: { full_name: 'Dr X' } });
      mockQueryRunner.manager.save.mockImplementation((s: any) => Promise.resolve(s));
      mockPlatformSettingRepository.findOne.mockResolvedValue({ booking_lead_minutes: 15, standard_consultation_rate: 850, commission_percent: 15 });
      const res = await service.createBookingSaga('patient-1', { slotId: 'slot-1', holdToken: TOKEN });
      expect(res.status).toBe(BookingStatus.PENDING);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_booked: true, hold_token: null, hold_expires_at: null }),
      );
    });

    it('without a hold, the same slot is rejected by the lead-time rule', async () => {
      const slot = mkSlot({ start_time: new Date(Date.now() + 8 * 60 * 1000), end_time: new Date(Date.now() + 38 * 60 * 1000) });
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(lockQb(slot));
      mockPlatformSettingRepository.findOne.mockResolvedValue({ booking_lead_minutes: 15 });
      await expect(service.createBookingSaga('patient-1', { slotId: 'slot-1' })).rejects.toThrow(
        'bookings close 15 minutes before the start',
      );
    });
  });

  describe('exchangeJoinLink (emailed Join button)', () => {
    const mkBooking = (over: any = {}) => ({
      id: 'b1',
      patient_id: 'p1',
      slot_id: 'slot-1',
      status: BookingStatus.CONFIRMED,
      ...over,
    });
    const slotAt = (startMin: number, lenMin = 30) => ({
      id: 'slot-1',
      start_time: new Date(Date.now() + startMin * 60000),
      end_time: new Date(Date.now() + (startMin + lenMin) * 60000),
    });
    const user = { id: 'p1', email: 'p@example.com', full_name: 'Pat', role: 'patient', status: 'active', phone: '1' };

    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(user);
      mockConsultationRepository.findOne.mockResolvedValue(null);
      mockExtensionRepository.find.mockResolvedValue([]);
    });

    it('returns a guest session bound to the booking when the window is open', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mkBooking());
      mockSlotRepository.findOne.mockResolvedValue(slotAt(10));
      const res = await service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'));
      expect(res.bookingId).toBe('b1');
      expect(res.accessToken).toBe('guest-access-token');
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'p1', scope: 'guest', bid: 'b1' }),
        { expiresIn: '6h' },
      );
    });

    it('still works while the consultation is running and shortly after', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mkBooking());
      mockSlotRepository.findOne.mockResolvedValue(slotAt(-20));
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).resolves.toBeDefined();
    });

    it('is not open more than 15 minutes before the start (tells the patient when)', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mkBooking());
      mockSlotRepository.findOne.mockResolvedValue(slotAt(30));
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TOO_EARLY' }),
      });
    });

    it('closes as soon as the booked time is over', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mkBooking());
      mockSlotRepository.findOne.mockResolvedValue(slotAt(-31)); // 30 min slot that ended a minute ago
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'EXPIRED' }),
      });
    });

    it('stays open past the booked time only while a paid extension covers it', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mkBooking());
      mockSlotRepository.findOne.mockResolvedValue(slotAt(-40)); // ended 10 min ago
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'c1', ended_at: null });
      mockExtensionRepository.find.mockResolvedValue([{ duration_minutes: 15 }]);
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).resolves.toBeDefined();
      mockExtensionRepository.find.mockResolvedValue([{ duration_minutes: 5 }]);
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'EXPIRED' }),
      });
    });

    it('is closed once the consultation has ended, even inside the booked time', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mkBooking());
      mockSlotRepository.findOne.mockResolvedValue(slotAt(-5));
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'c1', ended_at: new Date() });
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ENDED' }),
      });
      mockConsultationRepository.findOne.mockResolvedValue(null);
      mockBookingRepository.findOne.mockResolvedValue(mkBooking({ status: BookingStatus.COMPLETED }));
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ENDED' }),
      });
    });

    it('rejects invalid tokens, other patients, cancelled and unpaid bookings', async () => {
      await expect(service.exchangeJoinLink('garbage')).rejects.toThrow('invalid or has expired');

      mockBookingRepository.findOne.mockResolvedValue(mkBooking({ patient_id: 'someone-else' }));
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toThrow('could not find');

      mockBookingRepository.findOne.mockResolvedValue(mkBooking({ status: BookingStatus.CANCELLED }));
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toThrow('cancelled');

      mockBookingRepository.findOne.mockResolvedValue(mkBooking({ status: BookingStatus.PENDING }));
      await expect(service.exchangeJoinLink(signJoinLinkToken('b1', 'p1'))).rejects.toThrow('not been paid');
    });
  });

  describe('reconciliation grace', () => {
    it('does not release a very recent booked slot that has no booking yet (mid-saga)', async () => {
      mockSlotRepository.find.mockResolvedValue([{ id: 'fresh', is_booked: true, updated_at: new Date() }]);
      mockBookingRepository.find.mockResolvedValue([]);
      const res = await service.reconcileDatabaseDrift();
      expect(res.orphaned_slots_fixed).toBe(0);
    });
  });

  describe('reconcileDatabaseDrift', () => {
    it('should detect orphaned slots and release them', async () => {
      mockSlotRepository.find.mockResolvedValue([
        { id: 'orphaned-slot-1', is_booked: true, updated_at: new Date(Date.now() - 10 * 60 * 1000) },
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

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConsultationsService } from './consultations.service';
import { DailyService } from './daily.service';
import { ConsultationGateway } from './consultation.gateway';
import { NoShowProcessor } from './no-show.processor';
import {
  Consultation,
  ConsultationExtension,
  Booking,
  BookingStatus,
  PaymentStatus,
} from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';
import { PaymentsService } from '../payments/payments.service';

describe('ConsultationsService & Daily.co Core (Sprint 6)', () => {
  let service: ConsultationsService;
  let dailyService: DailyService;
  let gateway: ConsultationGateway;
  let noShowProcessor: NoShowProcessor;

  const mockConsultationRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'cons-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'cons-1', ...entity })),
  };

  const mockExtensionRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockBookingRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockSlotRepo = {
    findOne: jest.fn(),
  };

  const mockDoctorProfileRepo = {
    findOne: jest.fn(),
  };

  const mockNoShowQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  const mockPaymentsService = {
    processRefund: jest.fn().mockResolvedValue({ success: true, refund_method: 'paystack' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationsService,
        DailyService,
        ConsultationGateway,
        NoShowProcessor,
        {
          provide: getRepositoryToken(Consultation, 'patient'),
          useValue: mockConsultationRepo,
        },
        {
          provide: getRepositoryToken(ConsultationExtension, 'patient'),
          useValue: mockExtensionRepo,
        },
        {
          provide: getRepositoryToken(Booking, 'patient'),
          useValue: mockBookingRepo,
        },
        {
          provide: getRepositoryToken(AvailabilitySlot, 'operational'),
          useValue: mockSlotRepo,
        },
        {
          provide: getRepositoryToken(DoctorProfile, 'operational'),
          useValue: mockDoctorProfileRepo,
        },
        {
          provide: getQueueToken(QUEUES.NO_SHOW),
          useValue: mockNoShowQueue,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    service = module.get<ConsultationsService>(ConsultationsService);
    dailyService = module.get<DailyService>(DailyService);
    gateway = module.get<ConsultationGateway>(ConsultationGateway);
    noShowProcessor = module.get<NoShowProcessor>(NoShowProcessor);

    jest.clearAllMocks();
  });

  describe('DailyService (BE-601)', () => {
    it('should create room with 2-participant limit and buffer expiration', async () => {
      const slotEnd = new Date(Date.now() + 30 * 60 * 1000);
      const room = await dailyService.createRoom('booking-123', slotEnd);

      expect(room).toBeDefined();
      expect(room.name).toContain('chekup-booking-123');
      expect(room.privacy).toBe('private');
      expect(room.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should generate participant meeting token', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = await dailyService.createMeetingToken('chekup-room', 'Dr. Smith', true, exp);

      expect(token).toBeDefined();
      expect(token.token).toBeDefined();
    });
  });

  describe('ConsultationsService Lifecycle (BE-602, BE-605)', () => {
    it('should provision Daily.co room and schedule no-show BullMQ job', async () => {
      mockConsultationRepo.findOne.mockResolvedValueOnce(null);
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'booking-1',
        slot_id: 'slot-1',
        status: BookingStatus.CONFIRMED,
      });
      mockSlotRepo.findOne.mockResolvedValueOnce({
        id: 'slot-1',
        start_time: new Date(Date.now() + 10 * 60 * 1000),
        end_time: new Date(Date.now() + 40 * 60 * 1000),
      });

      const consultation = await service.provisionRoom('booking-1');

      expect(consultation).toBeDefined();
      expect(mockConsultationRepo.create).toHaveBeenCalled();
      expect(mockConsultationRepo.save).toHaveBeenCalled();
      expect(mockNoShowQueue.add).toHaveBeenCalledWith(
        'check-no-show',
        { bookingId: 'booking-1' },
        expect.any(Object),
      );
    });

    it('should stamp started_at when first participant joins and return meeting token', async () => {
      const mockCons: any = {
        id: 'cons-1',
        booking_id: 'booking-1',
        video_room_id: 'chekup-booking1',
        room_url: 'https://chekup247.daily.co/chekup-booking1',
        started_at: null,
        doctor_joined_at: null,
        patient_joined_at: null,
      };
      mockConsultationRepo.findOne.mockResolvedValue(mockCons);

      const result = await service.joinConsultation('booking-1', 'doctor', 'Dr. Test');

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.isFirstParticipant).toBe(true);
      expect(result.token).toBeDefined();
      expect(mockConsultationRepo.save).toHaveBeenCalled();
    });

    it('should end consultation, mark status completed, and enable prescription eligibility', async () => {
      const mockCons: any = {
        id: 'cons-1',
        booking_id: 'booking-1',
        ended_at: null,
      };
      const mockBooking: any = {
        id: 'booking-1',
        status: BookingStatus.CONFIRMED,
      };
      mockConsultationRepo.findOne.mockResolvedValue(mockCons);
      mockBookingRepo.findOne.mockResolvedValue(mockBooking);

      const result = await service.endConsultation('booking-1', 'doc-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe(BookingStatus.COMPLETED);
      expect(result.eligible_for_prescription).toBe(true);
      expect(mockBooking.status).toBe(BookingStatus.COMPLETED);
      expect(mockBookingRepo.save).toHaveBeenCalledWith(mockBooking);
    });

    it('should securely save doctor clinical notes (BE-605)', async () => {
      const mockCons: any = {
        id: 'cons-1',
        booking_id: 'booking-1',
        doctor_notes: null,
        updated_at: new Date(),
      };
      mockConsultationRepo.findOne.mockResolvedValue(mockCons);

      const result = await service.saveDoctorNotes('booking-1', 'Patient has mild pharyngitis.');

      expect(result.success).toBe(true);
      expect(result.doctor_notes).toBe('Patient has mild pharyngitis.');
      expect(mockConsultationRepo.save).toHaveBeenCalled();
    });
  });

  describe('Automated No-Show Detection Worker (BE-604)', () => {
    it('should detect Doctor No-Show, issue 100% full refund, and flag booking', async () => {
      const mockBooking: any = {
        id: 'booking-1',
        doctor_id: 'doc-user-1',
        status: BookingStatus.CONFIRMED,
        payment_status: PaymentStatus.HELD,
      };
      const mockCons: any = {
        id: 'cons-1',
        booking_id: 'booking-1',
        started_at: null,
        doctor_joined_at: null,
        patient_joined_at: new Date(), // Patient joined, doctor missed!
      };

      mockBookingRepo.findOne.mockResolvedValue(mockBooking);
      mockConsultationRepo.findOne.mockResolvedValue(mockCons);
      mockDoctorProfileRepo.findOne.mockResolvedValue({
        user_id: 'doc-user-1',
        hpcsa_number: 'MP123456',
        user: { full_name: 'Dr. NoShow' },
      });

      const job: any = {
        id: 'job-noshow-1',
        data: { bookingId: 'booking-1' },
      };

      const result = await noShowProcessor.process(job);

      expect(result.status).toBe('doctor_no_show');
      expect(result.refunded).toBe(true);
      expect(mockPaymentsService.processRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-1',
        }),
      );
      expect(mockBooking.status).toBe(BookingStatus.CANCELLED);
      expect(mockBooking.payment_status).toBe(PaymentStatus.REFUNDED);
    });

    it('should detect Patient No-Show and release doctor payout', async () => {
      const mockBooking: any = {
        id: 'booking-2',
        doctor_id: 'doc-user-1',
        status: BookingStatus.CONFIRMED,
        payment_status: PaymentStatus.HELD,
      };
      const mockCons: any = {
        id: 'cons-2',
        booking_id: 'booking-2',
        started_at: null,
        doctor_joined_at: new Date(), // Doctor joined, patient missed!
        patient_joined_at: null,
      };

      mockBookingRepo.findOne.mockResolvedValue(mockBooking);
      mockConsultationRepo.findOne.mockResolvedValue(mockCons);

      const job: any = {
        id: 'job-noshow-2',
        data: { bookingId: 'booking-2' },
      };

      const result = await noShowProcessor.process(job);

      expect(result.status).toBe('patient_no_show');
      expect(result.doctorPaid).toBe(true);
      expect(mockBooking.status).toBe(BookingStatus.NO_SHOW);
      expect(mockBooking.payment_status).toBe(PaymentStatus.RELEASED);
    });
  });
});

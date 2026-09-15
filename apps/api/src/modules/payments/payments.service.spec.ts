import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import {
  Payment,
  PaymentRecordStatus,
  Booking,
  BookingStatus,
  PaymentStatus,
  WalletCredit,
} from '../../database/patient/entities';
import { User } from '../../database/operational/entities';

describe('PaymentsService (Paystack & Wallet Credits)', () => {
  let service: PaymentsService;

  const mockPaymentRepository = {
    create: jest.fn((dto) => ({ ...dto, id: 'payment-123' })),
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: 'payment-123' })),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBookingRepository = {
    findOne: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockWalletCreditRepository = {
    create: jest.fn((dto) => ({ ...dto, id: 'credit-1' })),
    save: jest.fn((entity) => Promise.resolve(entity)),
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockPaystackService = {
    initializeTransaction: jest.fn().mockResolvedValue({
      authorization_url: 'https://checkout.paystack.com/access_code',
      access_code: 'acc_123',
      reference: 'ref_123',
    }),
    verifyTransaction: jest.fn(),
    createRefund: jest.fn().mockResolvedValue({ status: true }),
    verifyWebhookSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment, 'patient'), useValue: mockPaymentRepository },
        { provide: getRepositoryToken(Booking, 'patient'), useValue: mockBookingRepository },
        { provide: getRepositoryToken(WalletCredit, 'patient'), useValue: mockWalletCreditRepository },
        { provide: getRepositoryToken(User, 'operational'), useValue: mockUserRepository },
        { provide: PaystackService, useValue: mockPaystackService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiatePayment', () => {
    it('should cover full booking cost if patient has sufficient wallet credits', async () => {
      const booking = {
        id: 'booking-1',
        patient_id: 'patient-1',
        price: 500.0,
        status: BookingStatus.PENDING,
        payment_status: PaymentStatus.UNPAID,
      };

      const credits = [
        { id: 'c1', patient_id: 'patient-1', amount: 600.0, is_redeemed: false },
      ];

      mockBookingRepository.findOne.mockResolvedValue(booking);
      mockWalletCreditRepository.find.mockResolvedValue(credits);

      const res = await service.initiatePayment(
        { bookingId: 'booking-1', useWalletCredits: true },
        'patient-1',
      );

      expect(res.success).toBe(true);
      expect(res.covered_by_credits).toBe(true);
      expect(res.amount_paid).toBe(0);
      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.payment_status).toBe(PaymentStatus.HELD);
      expect(mockPaystackService.initializeTransaction).not.toHaveBeenCalled();
    });

    it('should initialize Paystack transaction for remaining balance when credits are partial', async () => {
      const booking = {
        id: 'booking-1',
        patient_id: 'patient-1',
        price: 850.0,
        status: BookingStatus.PENDING,
        payment_status: PaymentStatus.UNPAID,
      };

      const credits = [
        { id: 'c1', patient_id: 'patient-1', amount: 200.0, is_redeemed: false },
      ];

      mockBookingRepository.findOne.mockResolvedValue(booking);
      mockWalletCreditRepository.find.mockResolvedValue(credits);
      mockUserRepository.findOne.mockResolvedValue({ email: 'test@chekup247.com' });

      const res = await service.initiatePayment(
        { bookingId: 'booking-1', useWalletCredits: true },
        'patient-1',
      );

      expect(res.success).toBe(true);
      expect(res.covered_by_credits).toBe(false);
      expect(res.amount).toBe(650.0); // 850 - 200
      expect(res.credits_applied).toBe(200.0);
      expect(mockPaystackService.initializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amountInCents: 65000,
          email: 'test@chekup247.com',
        }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('should confirm booking and vault card authorization on charge.success', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);

      const payment = {
        id: 'payment-1',
        provider_ref: 'ref-123',
        status: PaymentRecordStatus.PENDING,
        booking: {
          id: 'booking-1',
          status: BookingStatus.PENDING,
          payment_status: PaymentStatus.UNPAID,
        },
      };

      mockPaymentRepository.findOne.mockResolvedValue(payment);

      const eventPayload = {
        event: 'charge.success',
        data: {
          reference: 'ref-123',
          authorization: {
            authorization_code: 'AUTH_token_abc',
            card_type: 'visa',
            last4: '4242',
          },
        },
      };

      const res = await service.handleWebhook(
        JSON.stringify(eventPayload),
        'valid-sig',
        eventPayload,
      );

      expect(res.received).toBe(true);
      expect(payment.status).toBe(PaymentRecordStatus.SUCCESS);
      expect((payment as any).authorization_code).toBe('AUTH_token_abc');
      expect((payment as any).last4).toBe('4242');
      expect(payment.booking.status).toBe(BookingStatus.CONFIRMED);
      expect(payment.booking.payment_status).toBe(PaymentStatus.HELD);
    });
  });
});

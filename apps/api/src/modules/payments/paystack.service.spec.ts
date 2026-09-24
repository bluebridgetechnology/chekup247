import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaystackService } from './paystack.service';
import { PlatformSetting } from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import * as crypto from 'crypto';

describe('PaystackService (Sandbox & Live Mode)', () => {
  let service: PaystackService;
  let mockPlatformSettingRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockPlatformSettingRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaystackService,
        {
          provide: getRepositoryToken(PlatformSetting, 'operational'),
          useValue: mockPlatformSettingRepo,
        },
      ],
    }).compile();

    service = module.get<PaystackService>(PaystackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveConfig', () => {
    it('should default to test mode when no DB record exists', async () => {
      mockPlatformSettingRepo.findOne.mockResolvedValue(null);

      const config = await service.getActiveConfig();
      expect(config.mode).toBe('test');
      expect(config.isMock).toBe(true); // Default env key has 'mock'
    });

    it('should use test keys from DB when paystack_mode is test', async () => {
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        paystack_mode: 'test',
        paystack_test_secret_key: 'sk_test_actual_test_key_123',
        paystack_test_public_key: 'pk_test_actual_pub_key_123',
      });

      const config = await service.getActiveConfig();
      expect(config.mode).toBe('test');
      expect(config.secretKey).toBe('sk_test_actual_test_key_123');
      expect(config.publicKey).toBe('pk_test_actual_pub_key_123');
      expect(config.isMock).toBe(false);
    });

    it('should use live keys from DB when paystack_mode is live', async () => {
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        paystack_mode: 'live',
        paystack_live_secret_key: 'sk_live_production_key_456',
        paystack_live_public_key: 'pk_live_production_pub_456',
      });

      const config = await service.getActiveConfig();
      expect(config.mode).toBe('live');
      expect(config.secretKey).toBe('sk_live_production_key_456');
      expect(config.publicKey).toBe('pk_live_production_pub_456');
      expect(config.isMock).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should report simulated mock mode when key contains mock', async () => {
      const res = await service.testConnection('sk_test_mock_secret');
      expect(res.success).toBe(true);
      expect(res.mode).toBe('mock');
      expect(res.message).toContain('simulated mock mode');
    });

    it('should return failure if no key is configured', async () => {
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        paystack_mode: 'test',
        paystack_test_secret_key: '',
      });
      // override env config fallback for this test
      jest.spyOn(service, 'getActiveConfig').mockResolvedValueOnce({
        mode: 'test',
        secretKey: '',
        isMock: false,
      });

      const res = await service.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('No Paystack secret key configured');
    });
  });

  describe('initializeTransaction (PAYSTACK_BYPASS)', () => {
    const originalBypass = (envConfig as any).PAYSTACK_BYPASS;
    const originalFetch = global.fetch;

    afterEach(() => {
      (envConfig as any).PAYSTACK_BYPASS = originalBypass;
      global.fetch = originalFetch;
      jest.restoreAllMocks();
    });

    it('should return a simulated checkout pointing at the callback URL when bypass is on and keys are mock', async () => {
      (envConfig as any).PAYSTACK_BYPASS = true;
      mockPlatformSettingRepo.findOne.mockResolvedValue(null); // default mock env key
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as any;

      const res = await service.initializeTransaction({
        email: 'patient@test.com',
        amountInCents: 85000,
        reference: 'chk_test_123',
        callbackUrl: 'http://localhost:3000/bookings/success?reference=chk_test_123',
      });

      expect(res.reference).toBe('chk_test_123');
      expect(res.authorization_url).toContain('/bookings/success');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return a simulated checkout when Paystack rejects with deactivated integration and bypass is on', async () => {
      (envConfig as any).PAYSTACK_BYPASS = true;
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        paystack_mode: 'test',
        paystack_test_secret_key: 'sk_test_deactivated_key_123',
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ status: false, message: 'Integration has been deactivated' }),
      }) as any;

      const res = await service.initializeTransaction({
        email: 'patient@test.com',
        amountInCents: 85000,
        reference: 'chk_abc',
        callbackUrl: 'http://localhost:3000/bookings/success?reference=chk_abc',
      });

      expect(res.reference).toBe('chk_abc');
      expect(res.authorization_url).toContain('/bookings/success');
    });

    it('should still throw when bypass is off', async () => {
      (envConfig as any).PAYSTACK_BYPASS = false;
      mockPlatformSettingRepo.findOne.mockResolvedValue(null); // mock key

      await expect(
        service.initializeTransaction({
          email: 'patient@test.com',
          amountInCents: 85000,
          reference: 'chk_test_123',
        }),
      ).rejects.toThrow('Paystack is not configured');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for mock keys', async () => {
      mockPlatformSettingRepo.findOne.mockResolvedValue(null);
      const res = await service.verifyWebhookSignature('{"event":"charge.success"}', 'any-sig');
      expect(res).toBe(true);
    });

    it('should verify valid HMAC-SHA512 signature for real test keys', async () => {
      const secret = 'sk_test_real_test_secret_999';
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        paystack_mode: 'test',
        paystack_test_secret_key: secret,
      });

      const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1' } });
      const validSignature = crypto.createHmac('sha512', secret).update(body).digest('hex');

      const isValid = await service.verifyWebhookSignature(body, validSignature);
      expect(isValid).toBe(true);

      const isInvalid = await service.verifyWebhookSignature(body, 'invalid_signature_hex');
      expect(isInvalid).toBe(false);
    });
  });
});

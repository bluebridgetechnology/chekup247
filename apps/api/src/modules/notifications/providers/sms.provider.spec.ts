import axios from 'axios';
import { SmsProvider } from './sms.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SmsProvider (SMS Portal Integration)', () => {
  let provider: SmsProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SmsProvider();
  });

  describe('sendSms in Sandbox mode (no credentials)', () => {
    it('should gracefully simulate SMS dispatch and return mock sid', async () => {
      const result = await provider.sendSms({
        to: '0821234567',
        message: 'Your ChekUp247 verification code is 123456',
      });

      expect(result.success).toBe(true);
      expect(result.sid).toContain('mock-smsportal');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('sendSms via SMS Portal RESTful API', () => {
    beforeEach(() => {
      // Set test credentials
      (provider as any).smsPortalApiKey = 'test-api-key';
      (provider as any).smsPortalApiSecret = 'test-api-secret';
      (provider as any).smsPortalApiUrl = 'https://rest.smsportal.com';
    });

    it('should format destination to 27... and make basic auth POST to /bulkmessages', async () => {
      const expectedCredentials = Buffer.from('test-api-key:test-api-secret').toString('base64');

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          eventId: 987654321,
          messages: 1,
          cost: 0.25,
          remainingBalance: 450.75,
        },
      });

      const result = await provider.sendSms({
        to: '082 123 4567', // SA local number with spaces
        message: 'ChekUp247: Appointment confirmed for Dr. Molefe',
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('987654321');
      expect(result.sid).toBe('987654321');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rest.smsportal.com/bulkmessages',
        {
          messages: [
            {
              content: 'ChekUp247: Appointment confirmed for Dr. Molefe',
              destination: '27821234567',
            },
          ],
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedCredentials}`,
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should handle API error gracefully without crashing', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { errorMessage: 'Unauthorized: Invalid API Credentials' },
        },
        message: 'Request failed with status code 401',
      });

      const result = await provider.sendSms({
        to: '+27829876543',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('checkBalance', () => {
    it('should query GET /balance with base64 credentials', async () => {
      (provider as any).smsPortalApiKey = 'test-key';
      (provider as any).smsPortalApiSecret = 'test-secret';
      (provider as any).smsPortalApiUrl = 'https://rest.smsportal.com';

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          balance: 325.5,
        },
      });

      const res = await provider.checkBalance();

      expect(res.success).toBe(true);
      expect(res.balance).toBe(325.5);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://rest.smsportal.com/balance',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from('test-key:test-secret').toString('base64')}`,
          }),
        }),
      );
    });
  });
});

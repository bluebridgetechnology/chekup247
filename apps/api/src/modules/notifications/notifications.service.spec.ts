import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationDeliveryStatus } from '../../database/patient/entities';
import { NotificationPreference, User, PushSubscription } from '../../database/operational/entities';
import { BrevoEmailProvider } from './providers/brevo.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { WebPushProvider } from './providers/web-push.provider';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsService (BE-804 to BE-809)', () => {
  let service: NotificationsService;

  const mockNotificationRepository = {
    create: jest.fn((dto) => ({ ...dto, id: 'notif-1', is_read: false })),
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'notif-1' })),
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 'notif-1', title: 'Test Alert', is_read: false }],
      1,
    ]),
    count: jest.fn().mockResolvedValue(1),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockPreferenceRepository = {
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto, id: 'pref-1' })),
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'pref-1' })),
  };

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'patient@example.com',
      phone: '+27821234567',
      full_name: 'Patient John',
    }),
  };

  const mockPushSubscriptionRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto, id: 'push-sub-1' })),
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'push-sub-1' })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockWebPushProvider = {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockBrevoProvider = {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  };

  const mockSmsProvider = {
    sendSms: jest.fn().mockResolvedValue({ success: true, sid: 'sms-1' }),
  };

  const mockWhatsAppProvider = {
    sendTemplateMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'wa-1' }),
  };

  const mockNotificationsGateway = {
    emitNotificationToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification, 'patient'), useValue: mockNotificationRepository },
        { provide: getRepositoryToken(NotificationPreference, 'operational'), useValue: mockPreferenceRepository },
        { provide: getRepositoryToken(User, 'operational'), useValue: mockUserRepository },
        { provide: getRepositoryToken(PushSubscription, 'operational'), useValue: mockPushSubscriptionRepository },
        { provide: BrevoEmailProvider, useValue: mockBrevoProvider },
        { provide: SmsProvider, useValue: mockSmsProvider },
        { provide: WhatsAppProvider, useValue: mockWhatsAppProvider },
        { provide: WebPushProvider, useValue: mockWebPushProvider },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPreferences (BE-807)', () => {
    it('should create default preferences if none exist', async () => {
      mockPreferenceRepository.findOne.mockResolvedValue(null);

      const pref = await service.getUserPreferences('user-1');

      expect(mockPreferenceRepository.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        channels: ['email', 'whatsapp'],
        reminders_enabled: true,
      });
      expect(pref.channels).toEqual(['email', 'whatsapp']);
    });
  });

  describe('updateUserPreferences (BE-807)', () => {
    it('should successfully update preferences with up to 2 valid channels', async () => {
      mockPreferenceRepository.findOne.mockResolvedValue({
        id: 'pref-1',
        user_id: 'user-1',
        channels: ['email'],
      });

      const updated = await service.updateUserPreferences('user-1', {
        channels: ['email', 'sms'],
        reminders_enabled: true,
      });

      expect(updated.channels).toEqual(['email', 'sms']);
    });

    it('should reject if more than 2 channels are selected', async () => {
      await expect(
        service.updateUserPreferences('user-1', {
          channels: ['email', 'sms', 'whatsapp'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid channels', async () => {
      await expect(
        service.updateUserPreferences('user-1', {
          channels: ['carrier_pigeon' as any],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispatchNotification (BE-804 to BE-807, BE-809)', () => {
    it('should dispatch alert to chosen channels and broadcast in-app', async () => {
      mockPreferenceRepository.findOne.mockResolvedValue({
        channels: ['email', 'sms'],
      });

      const result = await service.dispatchNotification({
        recipientId: 'user-1',
        title: 'Consultation Confirmed',
        templateId: 'booking_confirmed',
        payload: {
          appointmentDate: '2026-10-10',
          appointmentTime: '10:00',
        },
      });

      expect(result.channelsDispatched).toContain('in_app');
      expect(result.channelsDispatched).toContain('email');
      expect(result.channelsDispatched).toContain('sms');
      expect(mockBrevoProvider.sendEmail).toHaveBeenCalled();
      expect(mockSmsProvider.sendSms).toHaveBeenCalled();
      expect(mockNotificationsGateway.emitNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ title: 'Consultation Confirmed' }),
      );
    });
  });

  describe('In-App Notification Center API (BE-809)', () => {
    it('should return paginated notifications and unread count', async () => {
      const res = await service.getUserNotifications('user-1');

      expect(res.notifications).toHaveLength(1);
      expect(res.unreadCount).toBe(1);
    });

    it('should mark notification as read', async () => {
      const notif = { id: 'notif-1', recipient_id: 'user-1', is_read: false };
      mockNotificationRepository.findOne.mockResolvedValue(notif);

      const res = await service.markAsRead('notif-1', 'user-1');

      expect(res.is_read).toBe(true);
      expect(res.read_at).toBeInstanceOf(Date);
    });
  });
});

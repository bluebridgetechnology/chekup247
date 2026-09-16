import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TokenService } from '../auth/token.service';
import { Reflector } from '@nestjs/core';

describe('NotificationsController (Unit & Guard Resolution)', () => {
  let controller: NotificationsController;

  const mockNotificationsService = {
    getUserNotifications: jest.fn().mockResolvedValue({ notifications: [], total: 0, unreadCount: 0 }),
    getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
    markAsRead: jest.fn().mockResolvedValue({ success: true }),
    markAllAsRead: jest.fn().mockResolvedValue({ affected: 0 }),
    getPreferences: jest.fn().mockResolvedValue({ preferred_channels: ['email', 'sms'] }),
    updatePreferences: jest.fn().mockResolvedValue({ preferred_channels: ['email', 'sms'] }),
  };

  const mockTokenService = {
    verifyAccessToken: jest.fn().mockReturnValue({ sub: 'user-1', email: 'test@example.com', role: 'patient' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        JwtAuthGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should compile and resolve JwtAuthGuard with TokenService', () => {
    expect(controller).toBeDefined();
  });

  it('should get notifications for authenticated user', async () => {
    const result = await controller.getMyNotifications('user-1');
    expect(result).toBeDefined();
    expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith('user-1', 1, 20);
  });
});

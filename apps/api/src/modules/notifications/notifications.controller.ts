import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorators';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * BE-809: Get in-app notifications for the authenticated user.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      Number(page),
      Number(limit),
    );
  }

  /**
   * BE-809: Get unread in-app notification count for badge display.
   */
  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  /**
   * BE-809: Mark a notification as read.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  /**
   * BE-809: Mark all notifications as read for current user.
   */
  @UseGuards(JwtAuthGuard)
  @Post('read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * BE-807: Get notification channel preferences.
   */
  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  getMyPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUserPreferences(userId);
  }

  @Get('preferences/:userId')
  getPreferences(@Param('userId') userId: string) {
    return this.notificationsService.getUserPreferences(userId);
  }

  /**
   * BE-807: Update notification preferences (max 2 channels).
   */
  @UseGuards(JwtAuthGuard)
  @Put('preferences')
  updateMyPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: { channels: string[]; reminders_enabled?: boolean },
  ) {
    return this.notificationsService.updateUserPreferences(userId, dto);
  }

  @Put('preferences/:userId')
  updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: { channels: string[]; reminders_enabled?: boolean },
  ) {
    return this.notificationsService.updateUserPreferences(userId, dto);
  }

  @Get('user/:userId')
  getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      Number(page),
      Number(limit),
    );
  }

  /**
   * PA-1007: Public contact form submission endpoint.
   */
  @Post('contact')
  submitContactInquiry(
    @Body()
    dto: {
      name: string;
      email: string;
      subject: string;
      category?: string;
      message: string;
      phone?: string;
    },
  ) {
    return this.notificationsService.handleContactInquiry(dto);
  }
}

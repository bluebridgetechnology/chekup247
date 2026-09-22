import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../database/patient/entities';
import {
  NotificationPreference,
  User,
  PushSubscription,
} from '../../database/operational/entities';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { BrevoEmailProvider } from './providers/brevo.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { WebPushProvider } from './providers/web-push.provider';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification], 'patient'),
    TypeOrmModule.forFeature([NotificationPreference, User, PushSubscription], 'operational'),
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    BrevoEmailProvider,
    SmsProvider,
    WhatsAppProvider,
    WebPushProvider,
    NotificationsGateway,
  ],
  exports: [NotificationsService, NotificationsGateway, WebPushProvider, BrevoEmailProvider],
})
export class NotificationsModule {}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationDeliveryStatus,
} from '../../database/patient/entities';
import {
  NotificationPreference,
  User,
} from '../../database/operational/entities';
import { BrevoEmailProvider } from './providers/brevo.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { NotificationsGateway } from './notifications.gateway';

export interface DispatchNotificationOptions {
  recipientId: string;
  title: string;
  templateId: string;
  payload: Record<string, any>;
  deepLink?: string;
  forceChannels?: string[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification, 'patient')
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference, 'operational')
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    private readonly brevoEmailProvider: BrevoEmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly whatsAppProvider: WhatsAppProvider,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * BE-807: Get user channel preferences.
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let pref = await this.preferenceRepository.findOne({
      where: { user_id: userId },
    });

    if (!pref) {
      pref = this.preferenceRepository.create({
        user_id: userId,
        channels: ['email', 'whatsapp'],
        reminders_enabled: true,
      });
      await this.preferenceRepository.save(pref);
    }

    return pref;
  }

  /**
   * BE-807: Update user channel preferences with 2-channel maximum enforcement.
   */
  async updateUserPreferences(
    userId: string,
    dto: { channels: string[]; reminders_enabled?: boolean },
  ): Promise<NotificationPreference> {
    const { channels, reminders_enabled } = dto;

    if (!Array.isArray(channels) || channels.length === 0) {
      throw new BadRequestException('At least 1 notification channel must be selected');
    }

    if (channels.length > 2) {
      throw new BadRequestException('Patients may select a maximum of 2 preferred channels');
    }

    const validChannels = ['email', 'sms', 'whatsapp'];
    for (const ch of channels) {
      if (!validChannels.includes(ch)) {
        throw new BadRequestException(`Invalid notification channel: ${ch}. Allowed: email, sms, whatsapp`);
      }
    }

    let pref = await this.preferenceRepository.findOne({
      where: { user_id: userId },
    });

    if (!pref) {
      pref = this.preferenceRepository.create({
        user_id: userId,
        channels,
        reminders_enabled: reminders_enabled !== undefined ? reminders_enabled : true,
      });
    } else {
      pref.channels = channels;
      if (reminders_enabled !== undefined) {
        pref.reminders_enabled = reminders_enabled;
      }
    }

    return this.preferenceRepository.save(pref);
  }

  /**
   * BE-807, BE-804, BE-805, BE-806, BE-809:
   * Multi-Channel Notification Dispatcher with Preference Enforcement.
   */
  async dispatchNotification(options: DispatchNotificationOptions): Promise<{
    inAppNotificationId: string;
    channelsDispatched: string[];
  }> {
    const { recipientId, title, templateId, payload, deepLink, forceChannels } = options;

    // 1. Fetch user & notification preferences
    const user = await this.userRepository.findOne({ where: { id: recipientId } });
    const pref = await this.getUserPreferences(recipientId);

    const activeChannels = forceChannels || pref.channels || ['email', 'whatsapp'];
    const channelsDispatched: string[] = [];

    // 2. ALWAYS create and broadcast in-app notification (BE-809)
    const inAppRecord = this.notificationRepository.create({
      recipient_id: recipientId,
      channel: 'in_app',
      template_id: templateId,
      title,
      deep_link: deepLink || null,
      payload,
      status: NotificationDeliveryStatus.SENT,
      sent_at: new Date(),
      is_read: false,
    });
    const savedInApp = await this.notificationRepository.save(inAppRecord);
    channelsDispatched.push('in_app');

    // Real-time WebSocket broadcast
    try {
      this.notificationsGateway.emitNotificationToUser(recipientId, savedInApp);
    } catch (e: any) {
      this.logger.warn(`Could not broadcast WS notification to ${recipientId}: ${e.message}`);
    }

    // 3. Dispatch to patient's 1 or 2 chosen channels (BE-807)
    for (const ch of activeChannels) {
      if (ch === 'email' && user?.email) {
        try {
          const emailRes = await this.brevoEmailProvider.sendEmail({
            to: [{ email: user.email, name: user.full_name }],
            subject: title,
            templateId,
            templateParams: {
              ...payload,
              patientName: user.full_name,
            },
          });

          await this.notificationRepository.save(
            this.notificationRepository.create({
              recipient_id: recipientId,
              channel: 'email',
              template_id: templateId,
              title,
              payload,
              status: emailRes.success
                ? NotificationDeliveryStatus.SENT
                : NotificationDeliveryStatus.FAILED,
              sent_at: emailRes.success ? new Date() : null,
            }),
          );
          channelsDispatched.push('email');
        } catch (err: any) {
          this.logger.error(`Error sending email to ${user.email}: ${err.message}`);
        }
      }

      if (ch === 'sms' && user?.phone) {
        try {
          const smsText = `${title}: ${payload.message || 'Check your ChekUp247 account for details.'}`;
          const smsRes = await this.smsProvider.sendSms({
            to: user.phone,
            message: smsText,
          });

          await this.notificationRepository.save(
            this.notificationRepository.create({
              recipient_id: recipientId,
              channel: 'sms',
              template_id: templateId,
              title,
              payload,
              status: smsRes.success
                ? NotificationDeliveryStatus.SENT
                : NotificationDeliveryStatus.FAILED,
              sent_at: smsRes.success ? new Date() : null,
            }),
          );
          channelsDispatched.push('sms');
        } catch (err: any) {
          this.logger.error(`Error sending SMS to ${user.phone}: ${err.message}`);
        }
      }

      if (ch === 'whatsapp' && user?.phone) {
        try {
          const waRes = await this.whatsAppProvider.sendTemplateMessage({
            to: user.phone.replace(/[^0-9]/g, ''),
            templateName: templateId,
            parameters: [
              { type: 'text', text: user.full_name },
              { type: 'text', text: payload.appointmentDate || 'Upcoming' },
              { type: 'text', text: payload.appointmentTime || '' },
            ],
          });

          await this.notificationRepository.save(
            this.notificationRepository.create({
              recipient_id: recipientId,
              channel: 'whatsapp',
              template_id: templateId,
              title,
              payload,
              status: waRes.success
                ? NotificationDeliveryStatus.SENT
                : NotificationDeliveryStatus.FAILED,
              sent_at: waRes.success ? new Date() : null,
            }),
          );
          channelsDispatched.push('whatsapp');
        } catch (err: any) {
          this.logger.error(`Error sending WhatsApp to ${user.phone}: ${err.message}`);
        }
      }
    }

    return {
      inAppNotificationId: savedInApp.id,
      channelsDispatched,
    };
  }

  /**
   * BE-809: Fetch In-App notifications for a user with unread count.
   */
  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { recipient_id: userId, channel: 'in_app' },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { recipient_id: userId, channel: 'in_app', is_read: false },
    });

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * BE-809: Get unread count.
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepository.count({
      where: { recipient_id: userId, channel: 'in_app', is_read: false },
    });
    return { unreadCount };
  }

  /**
   * BE-809: Mark notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notif = await this.notificationRepository.findOne({
      where: { id: notificationId, recipient_id: userId },
    });

    if (!notif) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    notif.is_read = true;
    notif.read_at = new Date();
    return this.notificationRepository.save(notif);
  }

  /**
   * BE-809: Mark all notifications as read.
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
    const result = await this.notificationRepository.update(
      { recipient_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );

    return {
      success: true,
      count: result.affected || 0,
    };
  }

  /**
   * PA-1007: Public contact inquiry dispatch via Brevo email provider.
   */
  async handleContactInquiry(dto: {
    name: string;
    email: string;
    subject: string;
    category?: string;
    message: string;
    phone?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!dto.name || !dto.email || !dto.message) {
      throw new BadRequestException('Name, email, and message are required.');
    }

    this.logger.log(`Received contact inquiry from ${dto.name} (${dto.email}): [${dto.category || 'General'}] ${dto.subject}`);

    // Send inquiry notice to support team
    await this.brevoEmailProvider.sendEmail({
      to: [{ email: 'support@chekup247.co.za', name: 'ChekUp247 Support' }],
      subject: `[Contact Inquiry] ${dto.category ? `[${dto.category}] ` : ''}${dto.subject || 'New Patient Inquiry'}`,
      htmlContent: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0e9384;">New ChekUp247 Support Inquiry</h2>
          <p><strong>From:</strong> ${dto.name} &lt;${dto.email}&gt;</p>
          ${dto.phone ? `<p><strong>Phone:</strong> ${dto.phone}</p>` : ''}
          <p><strong>Category:</strong> ${dto.category || 'General Inquiry'}</p>
          <p><strong>Subject:</strong> ${dto.subject}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <h3>Message:</h3>
          <p style="white-space: pre-wrap; background: #f8fafc; padding: 16px; border-radius: 8px;">${dto.message}</p>
        </div>
      `,
    });

    // Send acknowledgment autoresponder to user
    await this.brevoEmailProvider.sendEmail({
      to: [{ email: dto.email, name: dto.name }],
      subject: `We've received your message: ${dto.subject || 'ChekUp247 Support'}`,
      htmlContent: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0e9384;">Thank you for contacting ChekUp247</h2>
          <p>Dear ${dto.name},</p>
          <p>We have successfully received your inquiry regarding <strong>"${dto.subject || 'Support'}"</strong>. Our clinical and support personnel are reviewing your message and will respond within 2 to 4 business hours.</p>
          <div style="background: #e6f7f5; padding: 14px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0e9384;">
            <p style="margin: 0; font-size: 13px; color: #0f766e;">
              <strong>Emergency Notice:</strong> ChekUp247 does not provide emergency medical rescue. If you are experiencing acute chest pain, severe trauma, or life-threatening distress, immediately call <strong>10177</strong> or <strong>112</strong>.
            </p>
          </div>
          <p>Warm regards,<br/>The ChekUp247 Support Team</p>
        </div>
      `,
    });

    return {
      success: true,
      message: 'Your inquiry has been submitted. A support confirmation has been sent to your email.',
    };
  }
}

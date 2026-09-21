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
  PushSubscription,
} from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import { BrevoEmailProvider } from './providers/brevo.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { WebPushProvider, PushPayload } from './providers/web-push.provider';
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
    @InjectRepository(PushSubscription, 'operational')
    private readonly pushSubRepository: Repository<PushSubscription>,
    private readonly brevoEmailProvider: BrevoEmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly whatsAppProvider: WhatsAppProvider,
    private readonly webPushProvider: WebPushProvider,
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
          const smsText = this.renderSmsMessage(templateId, payload, title);
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
              payload: {
                ...payload,
                provider: 'smsportal',
                sid: smsRes.sid,
                eventId: smsRes.eventId || smsRes.sid,
                destination: user.phone,
              },
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

    // Send inquiry notice to support team (destination configurable via SUPPORT_EMAIL env)
    await this.brevoEmailProvider.sendEmail({
      to: [{ email: envConfig.SUPPORT_EMAIL, name: envConfig.SUPPORT_EMAIL_NAME }],
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

  /**
   * Render concise, GSM-compliant SMS copy matching ChekUp247 standards.
   */
  private renderSmsMessage(
    templateId: string,
    payload: Record<string, any>,
    title: string,
  ): string {
    const docName = payload.doctorName || 'Doctor';
    const patientName = payload.patientName || 'Patient';
    const appDate = payload.appointmentDate || 'Upcoming';
    const appTime = payload.appointmentTime || '';
    const bookingId = payload.bookingId || '';
    const portalUrl = payload.portalUrl || envConfig.PATIENT_WEB_URL;
    const amount = payload.amount || '0.00';
    const ref = payload.payoutReference || payload.reference || bookingId;

    switch (templateId) {
      case 'otp_verification':
        return `ChekUp247: Your clinical verification code is ${payload.otp || '000000'}. Valid for 15 mins. Do not share this code.`;

      case 'booking_confirmed':
        return `ChekUp247: Consultation with Dr. ${docName} confirmed for ${appDate}${appTime ? ' at ' + appTime : ''}. Details: ${portalUrl}/bookings/${bookingId}`;

      case 'doctor_application_received':
        return `ChekUp247: Dr. ${docName}, your practitioner onboarding application (HPCSA ${payload.hpcsaNumber || 'Submitted'}) has been received and is under clinical review.`;

      case 'doctor_profile_approved':
        return `ChekUp247: Congratulations Dr. ${docName}! Your practitioner account is verified and approved. Set your schedule: ${portalUrl}/calendar`;

      case 'new_booking_doctor':
        return `ChekUp247: New booking with ${patientName} on ${appDate} at ${appTime} (SAST). View details: ${portalUrl}/doctor/consultations/${bookingId}`;

      case 'doctor_joined_room':
        return `ChekUp247: Dr. ${docName} is waiting in your video consultation room. Join now: ${portalUrl}/consultations/${bookingId}`;

      case 'patient_no_show_warning':
        return `ChekUp247 URGENT: Dr. ${docName} is waiting in your room. Connect within 5 mins to avoid appointment cancellation: ${portalUrl}/consultations/${bookingId}`;

      case 'prescription_issued':
        return `ChekUp247: Dr. ${docName} issued your e-prescription. Access your digitally signed script: ${portalUrl}/prescriptions/${payload.prescriptionId || bookingId}`;

      case 'medical_certificate_ready':
        return `ChekUp247: Your medical certificate from Dr. ${docName} is ready. Access it at: ${portalUrl}/records`;

      case 'review_request':
        return `ChekUp247: How was your consultation with Dr. ${docName}? Rate your experience: ${portalUrl}/reviews/new?bookingId=${bookingId}`;

      case 'doctor_earnings_credited':
        return `ChekUp247: R${amount} net earnings credited to your wallet for consultation #${bookingId}.`;

      case 'doctor_payout_dispatched':
        return `ChekUp247: Payout of R${amount} dispatched to your bank account. Ref: ${ref}.`;

      case 'appointment_reminder_24h':
      case 'appointment_reminder_1h':
      case 'appointment_reminder_15m': {
        const timing = templateId.includes('24h')
          ? '24 hours'
          : templateId.includes('1h')
          ? '1 hour'
          : '15 minutes';
        return `ChekUp247 Reminder: Consultation with Dr. ${docName} starts in ${timing} (${appDate} ${appTime}). Room: ${portalUrl}/consultations/${bookingId}`;
      }

      case 'booking_cancelled':
        return `ChekUp247: Your appointment with Dr. ${docName} for ${appDate} has been cancelled. Details: ${portalUrl}/bookings`;

      case 'booking_rescheduled':
        return `ChekUp247: Consultation with Dr. ${docName} rescheduled to ${appDate} at ${appTime}. Details: ${portalUrl}/bookings/${bookingId}`;

      default:
        return `${title}: ${payload.message || 'Check your ChekUp247 account for details.'}`;
    }
  }

  /**
   * Processes incoming delivery reports (DLR) from SMS Portal webhooks.
   */
  async handleSmsPortalWebhook(body: any): Promise<{ received: boolean; status?: string }> {
    this.logger.log(`[SMS Portal Webhook] Received DLR event: ${JSON.stringify(body)}`);

    const eventId = body?.eventId || body?.EventId || body?.event_id;
    const status = (body?.status || body?.Status || '').toLowerCase();

    if (eventId) {
      try {
        const notif = await this.notificationRepository
          .createQueryBuilder('n')
          .where("n.channel = 'sms'")
          .andWhere("n.payload->>'eventId' = :eventId", { eventId: String(eventId) })
          .getOne();

        if (notif) {
          if (status.includes('deliver') || status === 'delivered') {
            notif.status = NotificationDeliveryStatus.SENT;
          } else if (status.includes('fail') || status.includes('reject') || status === 'expired') {
            notif.status = NotificationDeliveryStatus.FAILED;
          }
          notif.payload = {
            ...notif.payload,
            dlrStatus: status,
            dlrUpdatedAt: new Date().toISOString(),
          };
          await this.notificationRepository.save(notif);
          this.logger.log(`[SMS Portal Webhook] Updated notification ${notif.id} status to: ${notif.status} (DLR: ${status})`);
        }
      } catch (err: any) {
        this.logger.warn(`[SMS Portal Webhook] Error updating status for eventId ${eventId}: ${err.message}`);
      }
    }

    return { received: true, status: 'processed' };
  }

  /**
   * Retrieves current SMS Portal account balance.
   */
  async getSmsBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
    return this.smsProvider.checkBalance();
  }

  /**
   * PWA: Register or update browser push subscription.
   */
  async savePushSubscription(
    userId: string,
    dto: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ): Promise<PushSubscription> {
    let existing = await this.pushSubRepository.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      existing.user_id = userId;
      existing.keys_p256dh = dto.keys.p256dh;
      existing.keys_auth = dto.keys.auth;
      existing.user_agent = dto.userAgent || existing.user_agent;
      return this.pushSubRepository.save(existing);
    }

    const newSub = this.pushSubRepository.create({
      user_id: userId,
      endpoint: dto.endpoint,
      keys_p256dh: dto.keys.p256dh,
      keys_auth: dto.keys.auth,
      user_agent: dto.userAgent,
    });
    return this.pushSubRepository.save(newSub);
  }

  /**
   * PWA: Delete browser push subscription.
   */
  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.pushSubRepository.delete({ user_id: userId, endpoint });
  }

  /**
   * PWA: Send web push notification to all active devices of a user.
   */
  async sendWebPushNotification(userId: string, payload: PushPayload): Promise<void> {
    const subscriptions = await this.pushSubRepository.find({
      where: { user_id: userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    for (const sub of subscriptions) {
      const result = await this.webPushProvider.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        },
        payload,
      );

      // Clean up dead subscriptions (410 or 404)
      if (result.isExpired) {
        this.logger.log(`[PWA Push] Removing expired push subscription ${sub.id}`);
        await this.pushSubRepository.delete(sub.id);
      }
    }
  }
}

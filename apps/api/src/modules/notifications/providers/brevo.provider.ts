import { Injectable, Logger } from '@nestjs/common';
import { envConfig } from '../../../config/env.config';

export interface SendEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  templateId?: string;
  templateParams?: Record<string, any>;
  htmlContent?: string;
}

@Injectable()
export class BrevoEmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);
  private readonly apiKey = envConfig.BREVO_API_KEY;
  private readonly senderEmail = envConfig.BREVO_SENDER_EMAIL;
  private readonly senderName = envConfig.BREVO_SENDER_NAME;

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    const { to, subject, templateParams, templateId, htmlContent } = options;
    const finalHtml = htmlContent || this.renderTemplate(templateId || 'default', templateParams || {});

    if (!this.apiKey) {
      this.logger.log(
        `[Brevo Sandbox] Simulated Email to: ${to.map((r) => r.email).join(', ')} | Subject: "${subject}" | Template: ${templateId}`,
      );
      return { success: true, messageId: `mock-brevo-${Date.now()}` };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to,
          subject,
          htmlContent: finalHtml,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Brevo email API error (${response.status}): ${errText}`);
        return { success: false };
      }

      const data = (await response.json()) as { messageId?: string };
      this.logger.log(`Brevo email dispatched successfully: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send email via Brevo: ${err.message}`);
      return { success: false };
    }
  }

  private renderTemplate(templateId: string, params: Record<string, any>): string {
    const patientName = params.patientName || 'Patient';
    const doctorName = params.doctorName || 'Doctor';
    const appointmentDate = params.appointmentDate || 'Upcoming';
    const appointmentTime = params.appointmentTime || '';
    const portalUrl = params.portalUrl || envConfig.PATIENT_WEB_URL;
    const bookingId = params.bookingId || '';

    const baseStyles = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      padding: 24px;
    `;
    const cardStyles = `
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 32px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    `;
    const buttonStyles = `
      display: inline-block;
      padding: 12px 24px;
      background: #0e9384;
      color: #ffffff;
      font-weight: 700;
      border-radius: 10px;
      text-decoration: none;
      margin-top: 20px;
    `;

    switch (templateId) {
      case 'booking_confirmed':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0e9384; margin: 0; font-size: 24px;">Appointment Confirmed</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">ChekUp247 Telehealth Consultation</p>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Your video consultation with <strong>Dr. ${doctorName}</strong> has been successfully booked and confirmed.</p>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Date:</strong> ${appointmentDate}</p>
                <p style="margin: 4px 0;"><strong>Time:</strong> ${appointmentTime} (SAST)</p>
                <p style="margin: 4px 0;"><strong>Booking Reference:</strong> ${bookingId}</p>
              </div>
              <p>Please ensure you are in a quiet room with good internet connectivity 5 minutes before the call.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/bookings/${bookingId}" style="${buttonStyles}">View Booking Details</a>
              </div>
            </div>
          </div>
        `;

      case 'appointment_reminder_24h':
      case 'appointment_reminder_1h':
      case 'appointment_reminder_15m': {
        const timing = templateId.includes('24h')
          ? '24 hours'
          : templateId.includes('1h')
          ? '1 hour'
          : '15 minutes';
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0e9384; margin: 0; font-size: 24px;">Consultation Reminder (${timing})</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your appointment is starting soon</p>
              </div>
              <p>Hi <strong>${patientName}</strong>,</p>
              <p>This is a reminder that your telehealth consultation with <strong>Dr. ${doctorName}</strong> starts in <strong>${timing}</strong>.</p>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Scheduled Start:</strong> ${appointmentDate} at ${appointmentTime} (SAST)</p>
                <p style="margin: 4px 0;"><strong>Grace Period:</strong> 10 minutes maximum after start time</p>
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}/consultation/${bookingId}" style="${buttonStyles}">Enter Consultation Room</a>
              </div>
            </div>
          </div>
        `;
      }

      case 'booking_cancelled':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #dc2626; margin: 0; font-size: 24px;">Booking Cancelled</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">ChekUp247 Consultation Notice</p>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Your appointment with <strong>Dr. ${doctorName}</strong> for <strong>${appointmentDate}</strong> has been cancelled.</p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0; color: #991b1b;">
                <p style="margin: 4px 0;"><strong>Refund / Credit Status:</strong> ${params.refundStatus || 'Processed according to 24h cancellation policy'}</p>
                ${params.creditAmount ? `<p style="margin: 4px 0;"><strong>Platform Credits Issued:</strong> R${params.creditAmount} (Never expires)</p>` : ''}
              </div>
              <p>You can book another time slot at your convenience on the platform.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/doctors" style="${buttonStyles}">Find Alternative Doctor</a>
              </div>
            </div>
          </div>
        `;

      case 'booking_rescheduled':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0e9384; margin: 0; font-size: 24px;">Appointment Rescheduled</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Updated Time Slot Confirmed</p>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Your consultation with <strong>Dr. ${doctorName}</strong> has been rescheduled to a new time.</p>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 20px 0; color: #065f46;">
                <p style="margin: 4px 0;"><strong>New Date:</strong> ${appointmentDate}</p>
                <p style="margin: 4px 0;"><strong>New Time:</strong> ${appointmentTime} (SAST)</p>
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}/bookings/${bookingId}" style="${buttonStyles}">View Rescheduled Booking</a>
              </div>
            </div>
          </div>
        `;

      default:
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h2 style="color: #0e9384;">ChekUp247 Notification</h2>
              <p>${params.message || 'You have an update regarding your consultation on ChekUp247.'}</p>
            </div>
          </div>
        `;
    }
  }
}

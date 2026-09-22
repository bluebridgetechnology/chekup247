import { Injectable, Logger } from '@nestjs/common';
import { envConfig } from '../../../config/env.config';

export interface SendEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  templateId?: string;
  templateParams?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
}

export interface BrevoTestResult {
  success: boolean;
  serverIp?: string;
  apiKeyConfigured: boolean;
  apiKeyPrefix?: string;
  senderEmail: string;
  senderName: string;
  recipient: string;
  brevoHttpStatus?: number;
  brevoResponse?: any;
  message: string;
  recommendations?: string[];
}

@Injectable()
export class BrevoEmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);

  // Dynamically resolve configuration from environment or envConfig
  private get apiKey(): string {
    return (process.env.BREVO_API_KEY || envConfig.BREVO_API_KEY || '').trim();
  }

  private get senderEmail(): string {
    return (process.env.BREVO_SENDER_EMAIL || envConfig.BREVO_SENDER_EMAIL || 'notifications@chekup247.com').trim();
  }

  private get senderName(): string {
    return (process.env.BREVO_SENDER_NAME || envConfig.BREVO_SENDER_NAME || 'ChekUp247 Telehealth').trim();
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: any }> {
    const { to, subject, templateParams, templateId, htmlContent, textContent } = options;
    const finalHtml = htmlContent || this.renderTemplate(templateId || 'default', templateParams || {});
    const plainText =
      textContent ||
      finalHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const apiKey = this.apiKey;
    const senderEmail = this.senderEmail;
    const senderName = this.senderName;

    // Sanitize recipient list
    const sanitizedTo = (to || [])
      .filter((r) => r && r.email && r.email.trim())
      .map((r) => ({
        email: r.email.trim(),
        ...(r.name && r.name.trim() ? { name: r.name.trim() } : {}),
      }));

    if (sanitizedTo.length === 0) {
      this.logger.error(`Brevo sendEmail aborted: no valid recipient email addresses provided`);
      return { success: false, error: 'No valid recipient email addresses provided' };
    }

    if (!apiKey) {
      this.logger.warn(
        `[Brevo Sandbox] BREVO_API_KEY is not configured in environment! Simulated Email to: ${sanitizedTo.map((r) => r.email).join(', ')} | Subject: "${subject}" | Template: ${templateId}. To dispatch real emails, define BREVO_API_KEY in .env.production.`,
      );
      return { success: true, messageId: `mock-brevo-${Date.now()}` };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: sanitizedTo,
          subject,
          htmlContent: finalHtml,
          textContent: plainText,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedError: any;
        try {
          parsedError = JSON.parse(errText);
        } catch {
          parsedError = { message: errText };
        }

        this.logger.error(
          `Brevo email API rejected request (HTTP ${response.status}): ${JSON.stringify(parsedError)} | Sender: "${senderName}" <${senderEmail}> | Recipients: ${sanitizedTo.map((t) => t.email).join(', ')}`,
        );

        // Targeted diagnostics for common Brevo issues
        if (response.status === 401 && parsedError.code === 'unauthorized' && parsedError.message === 'not verified') {
          this.logger.error(
            `[BREVO SECURITY ALERT] IP Authorization Required! Brevo blocked this request because your server's IP address is not authorized. Check your Brevo account email for an authorization link, or log in to Brevo Dashboard -> Settings -> Security -> Authorized IPs to whitelist your server IP.`,
          );
        } else if (response.status === 400 && parsedError.message?.toLowerCase().includes('sender')) {
          this.logger.error(
            `[BREVO CONFIG ERROR] Sender email "${senderEmail}" is not verified in Brevo! Go to Brevo Dashboard -> Senders & IP -> Senders and add/verify "${senderEmail}".`,
          );
        } else if (response.status === 401) {
          this.logger.error(
            `[BREVO AUTH ERROR] API Key rejected by Brevo. Ensure you are using a valid v3 API Key (starts with "xkeysib-"), NOT an SMTP key (starts with "xsmtpsib-").`,
          );
        }

        return { success: false, error: parsedError };
      }

      const data = (await response.json()) as { messageId?: string };
      this.logger.log(`Brevo email dispatched successfully: ${data.messageId} to ${sanitizedTo.map((t) => t.email).join(', ')}`);
      return { success: true, messageId: data.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to connect to Brevo API: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Diagnostic test method: checks API key, detects public IP, sends a test email,
   * and returns full technical feedback.
   */
  async testConnection(targetEmail?: string): Promise<BrevoTestResult> {
    const apiKey = this.apiKey;
    const senderEmail = this.senderEmail;
    const senderName = this.senderName;
    const recipient = targetEmail || senderEmail;

    // Detect server public IP to help with Brevo IP authorization
    let serverIp = 'Unknown';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      if (ipRes.ok) {
        const ipData = (await ipRes.json()) as { ip: string };
        serverIp = ipData.ip;
      }
    } catch {
      // ignore
    }

    if (!apiKey) {
      return {
        success: false,
        serverIp,
        apiKeyConfigured: false,
        senderEmail,
        senderName,
        recipient,
        message: 'BREVO_API_KEY is not set in environment or .env.production.',
        recommendations: [
          'Generate a v3 API Key in Brevo under Settings -> SMTP & API -> API Keys (starts with xkeysib-).',
          'Add BREVO_API_KEY=xkeysib-... to your .env.production on the VPS.',
          'Rebuild and restart the container with: docker compose -f docker-compose.prod.yml up -d --build api',
        ],
      };
    }

    const apiKeyPrefix = apiKey.length > 12 ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : '***';

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipient, name: 'ChekUp247 Admin Diagnostic' }],
          subject: 'ChekUp247 Brevo Integration Diagnostic Test',
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px; color: #201712;">
              <h2>ChekUp247 Brevo Integration Test</h2>
              <p>This is a diagnostic email verifying that Brevo Transactional Email is properly connected and operating.</p>
              <ul>
                <li><strong>Server IP:</strong> ${serverIp}</li>
                <li><strong>Sender:</strong> ${senderName} &lt;${senderEmail}&gt;</li>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
              </ul>
            </div>
          `,
          textContent: `ChekUp247 Brevo Integration Test. Server IP: ${serverIp}. Sender: ${senderEmail}. Timestamp: ${new Date().toISOString()}`,
        }),
      });

      const responseText = await response.text();
      let responseBody: any;
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { raw: responseText };
      }

      if (response.ok) {
        return {
          success: true,
          serverIp,
          apiKeyConfigured: true,
          apiKeyPrefix,
          senderEmail,
          senderName,
          recipient,
          brevoHttpStatus: response.status,
          brevoResponse: responseBody,
          message: `Email successfully accepted by Brevo! Message ID: ${responseBody.messageId}`,
        };
      }

      const recommendations: string[] = [];
      if (response.status === 401 && responseBody.code === 'unauthorized' && responseBody.message === 'not verified') {
        recommendations.push(
          `Brevo IP Authorization Required: Brevo blocked request from server IP ${serverIp}.`,
          `Check the email inbox of your Brevo account owner for a "Security Alert: Verify a new IP" message and click the verification link.`,
          `Alternatively, go to Brevo Dashboard -> Settings -> Security -> Authorized IPs and add server IP: ${serverIp}`,
        );
      } else if (response.status === 400 && responseBody.message?.toLowerCase().includes('sender')) {
        recommendations.push(
          `Sender email "${senderEmail}" is not verified in Brevo.`,
          `Go to Brevo Dashboard -> Senders & IP -> Senders, click "Add a sender", and verify "${senderEmail}".`,
        );
      } else if (response.status === 401) {
        recommendations.push(
          `API Key rejected. Make sure you generated an API Key (starts with "xkeysib-"), NOT an SMTP key (starts with "xsmtpsib-").`,
        );
      }

      return {
        success: false,
        serverIp,
        apiKeyConfigured: true,
        apiKeyPrefix,
        senderEmail,
        senderName,
        recipient,
        brevoHttpStatus: response.status,
        brevoResponse: responseBody,
        message: `Brevo API rejected the request with HTTP ${response.status}: ${JSON.stringify(responseBody)}`,
        recommendations,
      };
    } catch (err: any) {
      return {
        success: false,
        serverIp,
        apiKeyConfigured: true,
        apiKeyPrefix,
        senderEmail,
        senderName,
        recipient,
        message: `Network error connecting to Brevo API: ${err.message}`,
        recommendations: [
          'Verify outbound HTTPS (port 443) connectivity from your VPS to api.brevo.com.',
        ],
      };
    }
  }

  private renderTemplate(templateId: string, params: Record<string, any>): string {
    const patientName = params.patientName || 'Patient';
    const doctorName = params.doctorName || 'Doctor';
    const appointmentDate = params.appointmentDate || 'Upcoming';
    const appointmentTime = params.appointmentTime || '';
    const portalUrl = params.portalUrl || envConfig.PATIENT_WEB_URL;
    const bookingId = params.bookingId || '';
    const hpcsaNumber = params.hpcsaNumber || '';
    const specialty = params.specialty || 'General Practitioner';
    const amount = params.amount || '0.00';
    const prescriptionId = params.prescriptionId || bookingId || '';
    const icd10Code = params.icd10Code || '';

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
    const headerHtml = `
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2A170F; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ChekUp<span style="color: #DFAB62;">247</span>
        </h1>
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">
          Telehealth & Digital Healthcare South Africa
        </p>
      </div>
    `;
    const footerHtml = `
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        <p style="margin: 0; font-weight: 600; color: #64748b;">ChekUp247 (Pty) Ltd &bull; HPCSA Compliant &bull; POPIA Certified</p>
        <p style="margin: 4px 0 0 0;">Need clinical or technical assistance? Contact <a href="mailto:support@chekup247.com" style="color: #0e9384; text-decoration: none; font-weight: 600;">support@chekup247.com</a></p>
      </div>
    `;

    switch (templateId) {
      case 'otp_verification':
        const verifyLink = `${portalUrl}/verify-email?email=${encodeURIComponent(params.patientEmail || '')}&token=${params.otp || ''}`;
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Your one-time security code to verify your ChekUp247 account and access your telehealth consultation is:</p>
              <div style="background: #FAF6EE; border: 1.5px dashed #DFAB62; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2A170F; font-family: monospace;">${params.otp || '000000'}</span>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${verifyLink}" style="${buttonStyles}">Verify Account & Continue</a>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code expires in 15 minutes. Never share this code with anyone. ChekUp247 staff will never ask for your code.</p>
              <p style="color: #64748b; font-size: 13px; margin-top: 12px;">Verifying your account allows you to securely enter consultation rooms with doctors, receive HPCSA e-prescriptions, and review medical records.</p>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'booking_confirmed':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#10003; Consultation Confirmed
                </span>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Your video consultation with <strong>Dr. ${doctorName}</strong> has been successfully booked and payment secured in escrow.</p>
              <div style="background: #FAF6EE; border: 1px solid #DFAB62; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0; color: #2A170F;"><strong>Consulting Practitioner:</strong> Dr. ${doctorName} (${specialty})</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Date:</strong> ${appointmentDate}</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Time:</strong> ${appointmentTime} (SAST)</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Booking Reference:</strong> <span style="font-family: monospace; font-weight: 700;">${bookingId}</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">Please test your camera and microphone 5 minutes prior to your appointment time. Consultations take place directly in your web browser.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/bookings/${bookingId}" style="${buttonStyles}">View Booking & Waiting Room</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'doctor_application_received':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #eff6ff; color: #1e40af; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  Practitioner Application Received
                </span>
              </div>
              <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
              <p>Thank you for submitting your application to practice telemedicine on ChekUp247. We have received your credentials and documentation.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Practitioner Name:</strong> Dr. ${doctorName}</p>
                <p style="margin: 4px 0;"><strong>Specialty:</strong> ${specialty}</p>
                <p style="margin: 4px 0;"><strong>HPCSA Number:</strong> <span style="font-family: monospace; font-weight: 700;">${hpcsaNumber || 'Submitted'}</span></p>
                <p style="margin: 4px 0;"><strong>Documents Submitted:</strong> ${params.documentCount || 1} file(s)</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: 700;">Pending HPCSA Verification</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">Our clinical governance team verifies all medical practitioners against the official Health Professions Council of South Africa register. Verification typically takes <strong>24 to 48 business hours</strong>.</p>
              <p style="color: #475569; font-size: 14px;">Once approved, you will receive an immediate notification to set up your consultation fees and weekly calendar slots.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/doctor/status" style="${buttonStyles}">View Application Status</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'doctor_profile_approved':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#10003; Practitioner Profile Approved
                </span>
              </div>
              <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
              <p>Congratulations! Your HPCSA credentials and practitioner profile have been officially verified and approved by the ChekUp247 clinical administration team.</p>
              <div style="background: #FAF6EE; border: 1px solid #DFAB62; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0; color: #2A170F;"><strong>HPCSA Registration:</strong> <span style="font-family: monospace; font-weight: 700;">${hpcsaNumber}</span> (Active & Verified)</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Specialty:</strong> ${specialty}</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Telehealth Status:</strong> Active & Cleared for Consultations</p>
              </div>
              <h3 style="color: #2A170F; font-size: 16px; margin: 20px 0 8px 0;">Next Steps to Start Seeing Patients:</h3>
              <ol style="color: #475569; font-size: 14px; padding-left: 20px; line-height: 1.8;">
                <li>Log in to your <strong>Practitioner Portal</strong>.</li>
                <li>Set your <strong>weekly availability schedule</strong> and consultation hours.</li>
                <li>Ensure your digital signature and stamp are configured for e-prescriptions.</li>
              </ol>
              <div style="text-align: center;">
                <a href="${portalUrl}/calendar" style="${buttonStyles}">Open Schedule & Calendar</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'new_booking_doctor':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #eff6ff; color: #1e40af; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  New Appointment Booked
                </span>
              </div>
              <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
              <p>A patient has booked and paid for a telehealth consultation with you on ChekUp247.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Patient:</strong> ${patientName}</p>
                <p style="margin: 4px 0;"><strong>Date:</strong> ${appointmentDate}</p>
                <p style="margin: 4px 0;"><strong>Time:</strong> ${appointmentTime} (SAST)</p>
                <p style="margin: 4px 0;"><strong>Primary Reason:</strong> ${params.clinicalReason || 'General Telehealth Consultation'}</p>
                <p style="margin: 4px 0;"><strong>Booking Reference:</strong> <span style="font-family: monospace; font-weight: 700;">${bookingId}</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">The patient's payment is held securely in platform escrow and will be released to your practitioner wallet immediately upon conclusion of the consultation.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/doctor/consultations/${bookingId}" style="${buttonStyles}">View Triage Notes & Patient History</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'doctor_joined_room':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#9654; Doctor In Room
                </span>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p style="font-size: 16px; font-weight: 600; color: #0e9384;">Dr. ${doctorName} has arrived and is waiting in your ChekUp247 video consultation room.</p>
              <div style="background: #FAF6EE; border: 1px solid #DFAB62; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0; color: #2A170F;"><strong>Consulting Doctor:</strong> Dr. ${doctorName}</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Status:</strong> Waiting for you to connect</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Grace Period:</strong> 10 minutes maximum</p>
              </div>
              <p style="color: #475569; font-size: 14px;">Please click the button below right away to launch your encrypted HD video consultation.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/consultations/${bookingId}" style="${buttonStyles}">Join Video Room Now</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'patient_no_show_warning':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #fef2f2; color: #991b1b; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#9888; Action Required: Consultation in Progress
                </span>
              </div>
              <p>Hi <strong>${patientName}</strong>,</p>
              <p><strong>Dr. ${doctorName}</strong> is currently waiting in your consultation room. You have not yet joined the session.</p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 20px 0; color: #991b1b;">
                <p style="margin: 4px 0; font-weight: 700;">Urgent Grace Period Notice</p>
                <p style="margin: 4px 0; font-size: 13px;">In accordance with HPCSA guidelines and platform policy, consultations unattended after 10 minutes will be recorded as a patient no-show, and consultation fees will be forfeited to the doctor.</p>
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}/consultations/${bookingId}" style="${buttonStyles}">Enter Consultation Room Immediately</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'prescription_issued':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#10003; Digital E-Prescription Issued
                </span>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Following your telehealth consultation, <strong>Dr. ${doctorName}</strong> has generated your official South African digital prescription.</p>
              <div style="background: #FAF6EE; border: 1px solid #DFAB62; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0; color: #2A170F;"><strong>Prescribing Doctor:</strong> Dr. ${doctorName} (${specialty})</p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>HPCSA Number:</strong> <span style="font-family: monospace; font-weight: 700;">${hpcsaNumber || 'Verified'}</span></p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Diagnosis / ICD-10:</strong> <span style="font-weight: 700;">${icd10Code || 'Clinical Consultation'}</span></p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Prescription Reference:</strong> <span style="font-family: monospace;">${prescriptionId}</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">This prescription includes a cryptographic digital seal compliant with the South African Medicines Act. You can download the PDF or present it directly to any licensed South African community or courier pharmacy.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/prescriptions/${prescriptionId}" style="${buttonStyles}">View & Download Prescription</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'medical_certificate_ready':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#10003; Medical Certificate Ready
                </span>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p><strong>Dr. ${doctorName}</strong> has issued your official medical certificate (sick note) following your consultation.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Issuing Practitioner:</strong> Dr. ${doctorName}</p>
                <p style="margin: 4px 0;"><strong>Valid Period:</strong> ${params.validPeriod || 'As specified by doctor'}</p>
                <p style="margin: 4px 0;"><strong>Legal Compliance:</strong> HPCSA Ethical Rule 16 & BCEA Compliant</p>
              </div>
              <p style="color: #475569; font-size: 14px;">The certificate has been digitally signed and stored securely in your medical records for submission to your employer or educational institution.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/records/sick-notes" style="${buttonStyles}">Download Medical Certificate</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'review_request':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #FAF6EE; color: #2A170F; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid #DFAB62;">
                  &#9733; How Was Your Care?
                </span>
              </div>
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>Thank you for consulting with <strong>Dr. ${doctorName}</strong> on ChekUp247 today.</p>
              <p style="color: #475569; font-size: 14px;">Your honest review helps other South African patients find quality healthcare, and helps Dr. ${doctorName} maintain the highest standard of patient care.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 12px 0; font-weight: 700; color: #2A170F;">Rate your consultation experience:</p>
                <div style="font-size: 28px; letter-spacing: 8px;">
                  <a href="${portalUrl}/reviews/new?bookingId=${bookingId}&rating=5" style="text-decoration: none;">&#11088;</a>
                  <a href="${portalUrl}/reviews/new?bookingId=${bookingId}&rating=4" style="text-decoration: none;">&#11088;</a>
                  <a href="${portalUrl}/reviews/new?bookingId=${bookingId}&rating=3" style="text-decoration: none;">&#11088;</a>
                  <a href="${portalUrl}/reviews/new?bookingId=${bookingId}&rating=2" style="text-decoration: none;">&#11088;</a>
                  <a href="${portalUrl}/reviews/new?bookingId=${bookingId}&rating=1" style="text-decoration: none;">&#11088;</a>
                </div>
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}/reviews/new?bookingId=${bookingId}" style="${buttonStyles}">Leave a 30-Second Review</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'doctor_earnings_credited':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#10003; Wallet Credited
                </span>
              </div>
              <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
              <p>Consultation <strong>#${bookingId}</strong> has successfully concluded. Platform escrow funds have been released to your practitioner wallet.</p>
              <div style="background: #FAF6EE; border: 1px solid #DFAB62; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0; color: #2A170F;"><strong>Consultation Fee Credited:</strong> <span style="font-size: 20px; font-weight: 800; color: #0e9384;">R${amount}</span></p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Booking Reference:</strong> <span style="font-family: monospace;">${bookingId}</span></p>
                <p style="margin: 4px 0; color: #2A170F;"><strong>Settlement:</strong> Available for scheduled weekly payout or instant transfer</p>
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}/doctor/wallet" style="${buttonStyles}">View Wallet & Balance</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;

      case 'doctor_payout_dispatched':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  &#10003; Bank Payout Dispatched
                </span>
              </div>
              <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
              <p>A payout transfer from your ChekUp247 practitioner wallet has been dispatched to your registered South African bank account.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Payout Amount:</strong> <span style="font-size: 20px; font-weight: 800; color: #0e9384;">R${amount}</span></p>
                <p style="margin: 4px 0;"><strong>Bank Name:</strong> ${params.bankName || 'Verified Bank Account'}</p>
                <p style="margin: 4px 0;"><strong>Account Ending:</strong> ${params.accountLast4 || '****'}</p>
                <p style="margin: 4px 0;"><strong>Transfer Reference:</strong> <span style="font-family: monospace; font-weight: 700;">${params.payoutReference || bookingId}</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">Depending on your bank, funds typically reflect within 1 to 2 business days.</p>
              <div style="text-align: center;">
                <a href="${portalUrl}/doctor/payouts" style="${buttonStyles}">View Payout History</a>
              </div>
              ${footerHtml}
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
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #FAF6EE; color: #2A170F; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid #DFAB62;">
                  Consultation Reminder (${timing})
                </span>
              </div>
              <p>Hi <strong>${patientName}</strong>,</p>
              <p>This is a reminder that your telehealth consultation with <strong>Dr. ${doctorName}</strong> starts in <strong>${timing}</strong>.</p>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Scheduled Start:</strong> ${appointmentDate} at ${appointmentTime} (SAST)</p>
                <p style="margin: 4px 0;"><strong>Grace Period:</strong> 10 minutes maximum after start time</p>
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}/consultations/${bookingId}" style="${buttonStyles}">Enter Consultation Room</a>
              </div>
              ${footerHtml}
            </div>
          </div>
        `;
      }

      case 'booking_cancelled':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #fef2f2; color: #991b1b; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  Booking Cancelled
                </span>
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
              ${footerHtml}
            </div>
          </div>
        `;

      case 'booking_rescheduled':
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                  Appointment Rescheduled
                </span>
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
              ${footerHtml}
            </div>
          </div>
        `;

      default:
        return `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              ${headerHtml}
              <h2 style="color: #0e9384;">ChekUp247 Notification</h2>
              <p>${params.message || 'You have an update regarding your consultation on ChekUp247.'}</p>
              ${footerHtml}
            </div>
          </div>
        `;
    }
  }
}

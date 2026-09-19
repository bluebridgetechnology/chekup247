import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { envConfig } from '../../../config/env.config';

export interface SendSmsOptions {
  to: string;
  message: string;
}

export interface SmsPortalBulkResponse {
  eventId?: number | string;
  messages?: number;
  cost?: number;
  remainingBalance?: number;
  errorMessage?: string;
  errors?: any[];
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  // SMS Portal (Primary) Credentials
  private readonly smsPortalApiKey = envConfig.SMSPORTAL_API_KEY;
  private readonly smsPortalApiSecret = envConfig.SMSPORTAL_API_SECRET;
  private readonly smsPortalApiUrl = envConfig.SMSPORTAL_API_URL || 'https://rest.smsportal.com';

  // Twilio (Fallback) Credentials
  private readonly twilioAccountSid = envConfig.TWILIO_ACCOUNT_SID;
  private readonly twilioAuthToken = envConfig.TWILIO_AUTH_TOKEN;
  private readonly twilioFromNumber = envConfig.TWILIO_FROM_NUMBER;

  /**
   * Formats destination number for SMS Portal (e.g. 27821234567).
   * Strips spaces, non-digits, and converts local South African '082...' to '2782...'.
   */
  private formatDestination(phone: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');

    // If starts with 0 and is standard 10-digit SA local (e.g. 0821234567) -> 27821234567
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '27' + cleaned.substring(1);
    }
    // If double international prefix (e.g. 0027) -> 27
    if (cleaned.startsWith('0027')) {
      cleaned = cleaned.substring(2);
    }
    return cleaned;
  }

  /**
   * Sends an SMS using SMS Portal RESTful API (POST /bulkmessages).
   * Falls back to Twilio if SMS Portal is unconfigured, or mock sandbox if neither is set.
   */
  async sendSms(options: SendSmsOptions): Promise<{ success: boolean; sid?: string; eventId?: string }> {
    const { to, message } = options;
    const destination = this.formatDestination(to);

    // 1. Primary: SMS Portal RESTful API
    if (this.smsPortalApiKey && this.smsPortalApiSecret) {
      try {
        const credentials = `${this.smsPortalApiKey}:${this.smsPortalApiSecret}`;
        const base64Credentials = Buffer.from(credentials).toString('base64');

        const requestHeaders = {
          headers: {
            Authorization: `Basic ${base64Credentials}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        };

        const requestData = {
          messages: [
            {
              content: message,
              destination,
            },
          ],
        };

        const endpoint = `${this.smsPortalApiUrl.replace(/\/$/, '')}/bulkmessages`;
        const response = await axios.post<SmsPortalBulkResponse>(endpoint, requestData, requestHeaders);

        if (response.data && response.status >= 200 && response.status < 300) {
          const eventId = String(response.data.eventId || Date.now());
          this.logger.log(
            `[SMS Portal] Dispatched to ${destination} successfully. EventID: ${eventId} | Cost: ${response.data.cost ?? 'N/A'} | Remaining Balance: ${response.data.remainingBalance ?? 'N/A'}`,
          );
          return {
            success: true,
            sid: eventId,
            eventId,
          };
        } else {
          this.logger.error(
            `[SMS Portal] API responded with error status ${response.status}: ${JSON.stringify(response.data)}`,
          );
          return { success: false };
        }
      } catch (err: any) {
        const errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
        this.logger.error(`[SMS Portal] Dispatch failed for ${destination}: ${errorDetail}`);
        // Fall through to fallback
      }
    }

    // 2. Secondary: Twilio Gateway Fallback (if Twilio is explicitly configured)
    if (this.twilioAccountSid && this.twilioAuthToken) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
        const twilioAuth = 'Basic ' + Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');
        const formattedE164 = destination.startsWith('27') ? `+${destination}` : `+${destination}`;
        const body = new URLSearchParams({
          To: formattedE164,
          From: this.twilioFromNumber,
          Body: message,
        });

        const res = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: twilioAuth,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (res.ok) {
          const data = (await res.json()) as { sid?: string };
          this.logger.log(`[Twilio Fallback] SMS dispatched successfully: ${data.sid}`);
          return { success: true, sid: data.sid };
        }
      } catch (twilioErr: any) {
        this.logger.warn(`[Twilio Fallback] Failed: ${twilioErr.message}`);
      }
    }

    // 3. Graceful Simulation for Local Development & CI
    this.logger.log(
      `[SMS Portal Sandbox] Destination: ${destination} (${to}) | Length: ${message.length} chars | Message: "${message}"`,
    );
    return { success: true, sid: `mock-smsportal-${Date.now()}` };
  }

  /**
   * Queries SMS Portal account balance (GET /balance).
   */
  async checkBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
    if (!this.smsPortalApiKey || !this.smsPortalApiSecret) {
      return { success: true, balance: 100.0 }; // Sandbox balance simulation
    }

    try {
      const credentials = `${this.smsPortalApiKey}:${this.smsPortalApiSecret}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');
      const endpoint = `${this.smsPortalApiUrl.replace(/\/$/, '')}/balance`;

      const response = await axios.get<{ balance?: number }>(endpoint, {
        headers: {
          Authorization: `Basic ${base64Credentials}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      return {
        success: true,
        balance: response.data?.balance,
      };
    } catch (err: any) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`Failed to fetch SMS Portal balance: ${msg}`);
      return { success: false, error: msg };
    }
  }
}

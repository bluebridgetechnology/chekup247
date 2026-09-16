import { Injectable, Logger } from '@nestjs/common';
import { envConfig } from '../../../config/env.config';

export interface SendSmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly accountSid = envConfig.TWILIO_ACCOUNT_SID;
  private readonly authToken = envConfig.TWILIO_AUTH_TOKEN;
  private readonly fromNumber = envConfig.TWILIO_FROM_NUMBER;

  async sendSms(options: SendSmsOptions): Promise<{ success: boolean; sid?: string }> {
    const { to, message } = options;

    if (!this.accountSid || !this.authToken) {
      this.logger.log(`[SMS Gateway Sandbox] To: ${to} | Message: "${message}"`);
      return { success: true, sid: `mock-sms-${Date.now()}` };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: to,
        From: this.fromNumber,
        Body: message,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`SMS gateway dispatch failed (${res.status}): ${err}`);
        return { success: false };
      }

      const data = (await res.json()) as { sid?: string };
      this.logger.log(`SMS dispatched successfully: ${data.sid}`);
      return { success: true, sid: data.sid };
    } catch (err: any) {
      this.logger.error(`SMS dispatch error: ${err.message}`);
      return { success: false };
    }
  }
}

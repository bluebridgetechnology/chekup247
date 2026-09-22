import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  actions?: Array<{ action: string; title: string }>;
}

@Injectable()
export class WebPushProvider {
  private readonly logger = new Logger(WebPushProvider.name);
  private isConfigured = false;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@chekup247.com';

    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.isConfigured = true;
      this.logger.log('WebPush provider initialized with VAPID credentials.');
    } else {
      this.logger.warn('VAPID keys not provided. WebPush provider disabled.');
    }
  }

  async sendNotification(
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    payload: PushPayload,
  ): Promise<{ success: boolean; statusCode?: number; isExpired?: boolean }> {
    if (!this.isConfigured) {
      this.logger.debug('WebPush not configured, skipping send.');
      return { success: false };
    }

    try {
      const response = await webPush.sendNotification(
        subscription,
        JSON.stringify(payload),
      );
      return { success: true, statusCode: response.statusCode };
    } catch (error: any) {
      this.logger.warn(`WebPush send failed: ${error.message} (status: ${error.statusCode})`);
      const isExpired = error.statusCode === 404 || error.statusCode === 410;
      return { success: false, statusCode: error.statusCode, isExpired };
    }
  }
}

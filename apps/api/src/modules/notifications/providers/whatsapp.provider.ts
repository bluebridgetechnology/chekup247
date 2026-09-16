import { Injectable, Logger } from '@nestjs/common';
import { envConfig } from '../../../config/env.config';

export interface SendWhatsAppOptions {
  to: string; // e.g. "27821234567"
  templateName: string;
  parameters: { type: string; text?: string }[];
  actionButtons?: { type: 'url' | 'quick_reply'; text: string; url?: string }[];
}

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly apiToken = envConfig.WHATSAPP_API_TOKEN;
  private readonly phoneNumberId = envConfig.WHATSAPP_PHONE_NUMBER_ID;

  async sendTemplateMessage(
    options: SendWhatsAppOptions,
  ): Promise<{ success: boolean; messageId?: string }> {
    const { to, templateName, parameters } = options;

    if (!this.apiToken || !this.phoneNumberId) {
      this.logger.log(
        `[WhatsApp Business Sandbox] To: ${to} | Template: ${templateName} | Params: ${JSON.stringify(parameters)}`,
      );
      return { success: true, messageId: `mock-wa-${Date.now()}` };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`WhatsApp Business API error (${res.status}): ${err}`);
        return { success: false };
      }

      const data = (await res.json()) as { messages?: { id: string }[] };
      const messageId = data.messages?.[0]?.id || `wa-${Date.now()}`;
      this.logger.log(`WhatsApp template message dispatched successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (err: any) {
      this.logger.error(`WhatsApp dispatch failed: ${err.message}`);
      return { success: false };
    }
  }
}

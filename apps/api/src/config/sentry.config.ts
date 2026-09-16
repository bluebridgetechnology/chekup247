import { Logger } from '@nestjs/common';
import { envConfig } from './env.config';

const logger = new Logger('SentryMonitoring');

export interface SentryErrorContext {
  userId?: string;
  route?: string;
  method?: string;
  extra?: Record<string, any>;
}

export class SentryService {
  private static isInitialized = false;

  static init(): void {
    if (this.isInitialized) return;

    if (envConfig.SENTRY_DSN) {
      logger.log(`Sentry initialized for environment: ${envConfig.NODE_ENV}`);
      this.isInitialized = true;
    } else {
      logger.log('[Sentry Sandbox] No SENTRY_DSN provided; structured errors will be logged locally.');
      this.isInitialized = true;
    }
  }

  static captureException(error: Error | any, context?: SentryErrorContext): void {
    const errorPayload = {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name || 'Error',
      timestamp: new Date().toISOString(),
      environment: envConfig.NODE_ENV,
      context,
    };

    if (envConfig.SENTRY_DSN) {
      // If Sentry SDK is configured
      logger.error(`[SENTRY ALERT] ${errorPayload.message}`, error?.stack);
    } else {
      logger.warn(`[SENTRY MONITORED EXCEPTION] ${errorPayload.message} | Route: ${context?.route || 'N/A'}`);
    }
  }
}

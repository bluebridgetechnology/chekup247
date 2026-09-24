import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { createGlobalValidationPipe } from './common/pipes/validation.pipe';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { SentryService } from './config/sentry.config';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const operationalDataSource = app.get<DataSource>('operationalDataSource');
  const patientDataSource = app.get<DataSource>('patientDataSource');
  await operationalDataSource.runMigrations();
  await patientDataSource.runMigrations();

  // Configure body parser limit for file & avatar uploads
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ limit: '25mb', extended: true }));

  // Global prefixes and middlewares
  app.setGlobalPrefix('api/v1', {
    exclude: ['health/live', 'health/ready'],
  });

  // Cookie parsing middleware
  app.use((req: any, res: any, next: any) => {
    if (req.headers.cookie) {
      const list: Record<string, string> = {};
      req.headers.cookie.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
          list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('='));
        }
      });
      req.cookies = list;
    } else {
      req.cookies = {};
    }
    next();
  });

  // Initialize Sentry Monitoring (OPS-1002)
  SentryService.init();

  // Security Headers Middleware & CSP (SEC-1002)
  app.use((req: any, res: any, next: any) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.paystack.co https://*.daily.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.daily.co https://*.daily.co wss: ws: https://api.paystack.co; frame-src 'self' https://checkout.paystack.com https://*.daily.co;",
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self "https://*.daily.co"), microphone=(self "https://*.daily.co")');
    if (envConfig.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // Enable CORS for frontend applications (domain-locked)
  app.enableCors({
    origin: [
      envConfig.PATIENT_WEB_URL,
      envConfig.DOCTOR_PORTAL_URL,
      envConfig.ADMIN_PANEL_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ],
    credentials: true,
  });

  // Global Filters, Interceptors, Pipes, and Rate Limiting (SEC-1001)
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalGuards(new RateLimitGuard());

  const port = envConfig.PORT || 4000;
  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(` ChekUp247 Telehealth API started on port ${port}`);
  logger.log(` Environment: ${envConfig.NODE_ENV}`);
  logger.log(` Live Health:  http://localhost:${port}/health/live`);
  logger.log(` Ready Health: http://localhost:${port}/health/ready`);
  logger.log(` API Base:     http://localhost:${port}/api/v1`);
  logger.log(`=======================================================`);
}

bootstrap();

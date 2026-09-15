import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { createGlobalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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

  // Enable CORS for frontend applications
  app.enableCors({
    origin: [
      envConfig.PATIENT_WEB_URL,
      envConfig.DOCTOR_PORTAL_URL,
      envConfig.ADMIN_PANEL_URL,
    ],
    credentials: true,
  });

  // Global Filters, Interceptors, Pipes
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(createGlobalValidationPipe());

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

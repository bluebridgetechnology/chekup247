import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          this.logger.log(
            JSON.stringify({
              type: 'request',
              method,
              url: originalUrl,
              statusCode,
              durationMs: duration,
              ip,
              userAgent,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const statusCode = err.status || 500;

          this.logger.error(
            JSON.stringify({
              type: 'request_error',
              method,
              url: originalUrl,
              statusCode,
              durationMs: duration,
              errorMessage: err.message,
              ip,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}

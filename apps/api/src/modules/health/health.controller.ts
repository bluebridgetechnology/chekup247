import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import Redis from 'ioredis';
import { envConfig } from '../../config/env.config';

@Controller('health')
export class HealthController {
  private readonly redisClient: Redis;

  constructor(
    @InjectDataSource('operational')
    private readonly operationalDataSource: DataSource,
    @InjectDataSource('patient')
    private readonly patientDataSource: DataSource,
    private readonly storageService: StorageService,
  ) {
    this.redisClient = new Redis({
      host: envConfig.REDIS_HOST,
      port: envConfig.REDIS_PORT,
      password: envConfig.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  /**
   * Liveness probe: returns 200 if the NestJS process is running
   */
  @Get('live')
  getLive() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe: checks Operational DB, Patient DB, Redis, Storage with latency
   */
  @Get('ready')
  async getReady(@Res() res: Response) {
    const checks: Record<string, { status: 'up' | 'down'; latencyMs: number; error?: string }> = {};

    // 1. Check Operational Postgres
    const opStart = Date.now();
    try {
      if (this.operationalDataSource.isInitialized) {
        await this.operationalDataSource.query('SELECT 1');
        checks.operationalDatabase = {
          status: 'up',
          latencyMs: Date.now() - opStart,
        };
      } else {
        checks.operationalDatabase = {
          status: 'down',
          latencyMs: Date.now() - opStart,
          error: 'DataSource not initialized',
        };
      }
    } catch (err: any) {
      checks.operationalDatabase = {
        status: 'down',
        latencyMs: Date.now() - opStart,
        error: err.message,
      };
    }

    // 2. Check Patient Postgres
    const patStart = Date.now();
    try {
      if (this.patientDataSource.isInitialized) {
        await this.patientDataSource.query('SELECT 1');
        checks.patientDatabase = {
          status: 'up',
          latencyMs: Date.now() - patStart,
        };
      } else {
        checks.patientDatabase = {
          status: 'down',
          latencyMs: Date.now() - patStart,
          error: 'DataSource not initialized',
        };
      }
    } catch (err: any) {
      checks.patientDatabase = {
        status: 'down',
        latencyMs: Date.now() - patStart,
        error: err.message,
      };
    }

    // 3. Check Redis
    const redisStart = Date.now();
    try {
      if (this.redisClient.status === 'wait') {
        await this.redisClient.connect();
      }
      const pingRes = await this.redisClient.ping();
      checks.redis = {
        status: pingRes === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - redisStart,
      };
    } catch (err: any) {
      checks.redis = {
        status: 'down',
        latencyMs: Date.now() - redisStart,
        error: err.message,
      };
    }

    // 4. Check Storage (MinIO / S3)
    const storageStart = Date.now();
    try {
      const storageAlive = await this.storageService.ping();
      checks.storage = {
        status: storageAlive ? 'up' : 'down',
        latencyMs: Date.now() - storageStart,
      };
    } catch (err: any) {
      checks.storage = {
        status: 'down',
        latencyMs: Date.now() - storageStart,
        error: err.message,
      };
    }

    const isHealthy = Object.values(checks).every((c) => c.status === 'up');
    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: checks,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/operational/entities';

export interface AuditLogEntryDto {
  userId?: string;
  userRole?: string;
  patientId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogsFilterQuery {
  patientId?: string;
  userId?: string;
  userRole?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog, 'operational')
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * BE-907: POPIA Health Record Audit Logging
   * Records every access, creation, view, update or download of patient clinical data
   */
  async logHealthRecordAccess(entry: AuditLogEntryDto): Promise<AuditLog> {
    try {
      const record = this.auditLogRepository.create({
        user_id: entry.userId || null,
        user_role: entry.userRole || 'patient',
        patient_id: entry.patientId || null,
        action: entry.action,
        ip_address: entry.ipAddress || 'unknown',
        user_agent: entry.userAgent ? entry.userAgent.slice(0, 255) : 'unknown',
        metadata: {
          ...entry.metadata,
          popia_compliant: true,
          logged_at: new Date().toISOString(),
        },
      });

      const saved = await this.auditLogRepository.save(record);
      this.logger.log(
        `POPIA Health Record Audit: [${entry.action}] patient=${entry.patientId || 'none'} by user=${entry.userId || 'anonymous'} (${entry.userRole || 'guest'}) from ${entry.ipAddress || 'unknown'}`,
      );
      return saved;
    } catch (err: any) {
      this.logger.error(`Failed to write POPIA audit log: ${err.message}`);
      // Audit failures must not crash the caller, but are critically logged
      return null as any;
    }
  }

  /**
   * Queries audit logs with POPIA filtering parameters for Admin Inspector (AP-904)
   */
  async getAuditLogs(
    query: AuditLogsFilterQuery = {},
  ): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (query.patientId) {
      qb.andWhere('log.patient_id = :patientId', { patientId: query.patientId });
    }

    if (query.userId) {
      qb.andWhere('log.user_id = :userId', { userId: query.userId });
    }

    if (query.userRole && query.userRole !== 'all') {
      qb.andWhere('log.user_role = :userRole', { userRole: query.userRole });
    }

    if (query.action && query.action !== 'all') {
      qb.andWhere('log.action ILIKE :action', { action: `%${query.action}%` });
    }

    if (query.startDate) {
      qb.andWhere('log.created_at >= :startDate', { startDate: new Date(query.startDate) });
    }

    if (query.endDate) {
      qb.andWhere('log.created_at <= :endDate', { endDate: new Date(query.endDate) });
    }

    qb.orderBy('log.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [logs, total] = await qb.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

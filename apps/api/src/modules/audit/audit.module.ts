import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../database/operational/entities';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog], 'operational')],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

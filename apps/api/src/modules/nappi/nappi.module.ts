import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QUEUES } from '../queues/queue.constants';
import { NappiProduct, NappiPrice } from '../../database/operational/entities';
import { NappiImporterService } from './nappi-importer.service';
import { NappiImportProcessor } from './nappi-import.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([NappiProduct, NappiPrice], 'operational'),
    BullModule.registerQueue({
      name: QUEUES.NAPPI_IMPORT,
    }),
  ],
  providers: [NappiImporterService, NappiImportProcessor],
  exports: [NappiImporterService],
})
export class NappiModule {}

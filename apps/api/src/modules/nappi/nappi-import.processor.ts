import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';
import { NappiImporterService, ImportSummary } from './nappi-importer.service';

export interface NappiImportJobData {
  filePath: string;
  trigger?: 'manual' | 'scheduled' | 'cli';
}

@Processor(QUEUES.NAPPI_IMPORT)
@Injectable()
export class NappiImportProcessor extends WorkerHost {
  private readonly logger = new Logger(NappiImportProcessor.name);

  constructor(private readonly nappiImporterService: NappiImporterService) {
    super();
  }

  async process(job: Job<NappiImportJobData, ImportSummary, string>): Promise<ImportSummary> {
    this.logger.log(`Processing NAPPI import job ${job.id} (trigger: ${job.data.trigger || 'manual'})`);
    this.logger.log(`Source file: ${job.data.filePath}`);

    const summary = await this.nappiImporterService.importFile(job.data.filePath, {
      logger: (msg) => this.logger.log(msg),
    });

    return summary;
  }
}

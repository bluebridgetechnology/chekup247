import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';
import { DirectorySyncService } from './directory-sync.service';

@Processor(QUEUES.DIRECTORY_SYNC)
@Injectable()
export class DirectorySyncProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DirectorySyncProcessor.name);

  constructor(
    @InjectQueue(QUEUES.DIRECTORY_SYNC)
    private readonly directorySyncQueue: Queue,
    private readonly directorySyncService: DirectorySyncService,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      // Schedule repeatable job every 30 minutes
      const existingRepeatables = await this.directorySyncQueue.getRepeatableJobs();
      const jobKey = 'locumstaff-directory-sync';

      const alreadyScheduled = existingRepeatables.some(
        (job) => job.name === jobKey,
      );

      if (!alreadyScheduled) {
        await this.directorySyncQueue.add(
          jobKey,
          { trigger: 'scheduled-30min' },
          {
            repeat: {
              every: 30 * 60 * 1000, // 30 minutes in ms
            },
            removeOnComplete: 50,
            removeOnFail: 100,
          },
        );
        this.logger.log('Scheduled repeatable BullMQ job: locumstaff-directory-sync every 30 minutes.');
      }

      // Trigger an initial sync on startup in development or if table empty
      setTimeout(async () => {
        try {
          this.logger.log('Running initial LocumStaff directory check on boot...');
          await this.directorySyncService.syncDoctors();
        } catch (err: any) {
          this.logger.warn(`Initial directory sync deferred: ${err.message}`);
        }
      }, 3000);
    } catch (err: any) {
      this.logger.warn(`Could not register repeatable sync job in Redis: ${err.message}`);
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing directory sync job: ${job.id} (${job.name})`);
    return this.directorySyncService.syncDoctors();
  }
}

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';
import { AvailabilitySyncService } from './availability-sync.service';

@Processor(QUEUES.AVAILABILITY_SYNC)
@Injectable()
export class AvailabilitySyncProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AvailabilitySyncProcessor.name);

  constructor(
    @InjectQueue(QUEUES.AVAILABILITY_SYNC)
    private readonly availabilityQueue: Queue,
    private readonly availabilitySyncService: AvailabilitySyncService,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      const existingRepeatables = await this.availabilityQueue.getRepeatableJobs();
      const jobKey = 'locumstaff-availability-sync';

      const alreadyScheduled = existingRepeatables.some(
        (job) => job.name === jobKey,
      );

      if (!alreadyScheduled) {
        await this.availabilityQueue.add(
          jobKey,
          { trigger: 'scheduled-30min' },
          {
            repeat: {
              every: 30 * 60 * 1000, // 30 minutes
            },
            removeOnComplete: 50,
            removeOnFail: 100,
          },
        );
        this.logger.log(
          'Scheduled repeatable BullMQ job: locumstaff-availability-sync every 30 minutes.',
        );
      }

      // Initial sync on startup after brief delay
      setTimeout(async () => {
        try {
          this.logger.log('Running initial LocumStaff availability check on boot...');
          await this.availabilitySyncService.syncAvailability();
        } catch (err: any) {
          this.logger.warn(`Initial availability sync deferred: ${err.message}`);
        }
      }, 5000);
    } catch (err: any) {
      this.logger.warn(`Could not register repeatable availability sync in Redis: ${err.message}`);
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing availability sync job: ${job.id} (${job.name})`);
    return this.availabilitySyncService.syncAvailability(job.data);
  }
}

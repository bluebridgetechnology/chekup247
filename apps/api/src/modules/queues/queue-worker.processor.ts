import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from './queue.constants';

@Processor(QUEUES.NOTIFICATIONS)
export class QueueWorkerProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueWorkerProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `[QueueWorker] Processing job ${job.id} of type ${job.name} in queue ${job.queueName}`,
    );

    switch (job.name) {
      case 'test-ping':
        return { status: 'pong', timestamp: new Date().toISOString() };
      default:
        this.logger.debug(`Job payload: ${JSON.stringify(job.data)}`);
        return { received: true };
    }
  }
}

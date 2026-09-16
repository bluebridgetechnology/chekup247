import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUES } from './queue.constants';
import { Review } from '../../database/patient/entities';
import { DoctorProfile } from '../../database/operational/entities';

@Processor(QUEUES.RATING_SYNC)
export class RatingSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(RatingSyncProcessor.name);

  constructor(
    @InjectRepository(Review, 'patient')
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {
    super();
  }

  async process(job: Job<{ doctorId: string }, any, string>): Promise<any> {
    const { doctorId } = job.data;
    this.logger.log(`Processing RatingSyncJob for doctor ${doctorId}`);

    if (!doctorId) {
      this.logger.warn('RatingSyncJob missing doctorId parameter');
      return { skipped: true, reason: 'missing_doctor_id' };
    }

    try {
      const stats = await this.reviewRepository
        .createQueryBuilder('review')
        .select('COUNT(review.id)', 'count')
        .addSelect('AVG(review.rating)', 'avg')
        .where('review.doctor_id = :doctorId', { doctorId })
        .getRawOne();

      const count = Number(stats?.count || 0);
      const avg = Number(Number(stats?.avg || 0).toFixed(2));

      await this.doctorProfileRepository.update(
        { id: doctorId },
        {
          rating_avg: avg,
          reviews_count: count,
        },
      );

      this.logger.log(
        `Successfully synced rating for doctor ${doctorId}: avg=${avg}, count=${count}`,
      );
      return { doctorId, ratingAvg: avg, reviewsCount: count };
    } catch (err: any) {
      this.logger.error(
        `Failed to sync rating for doctor ${doctorId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}

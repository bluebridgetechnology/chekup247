import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Review, Booking, BookingStatus } from '../../database/patient/entities';
import { DoctorProfile, User } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';

export interface CreateReviewDto {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface ReviewDistribution {
  stars: number;
  count: number;
  percentage: number;
}

export interface DoctorReviewsResponse {
  doctorId: string;
  ratingAvg: number;
  reviewsCount: number;
  distribution: Record<number, { count: number; percentage: number }>;
  reviews: Array<
    Review & {
      patientName?: string;
    }
  >;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review, 'patient')
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @Optional()
    @InjectQueue(QUEUES.RATING_SYNC)
    private readonly ratingSyncQueue?: Queue,
  ) {}

  /**
   * BE-901: Patient submits a review for a completed consultation.
   * Restricts review submission to completed consultations, one review per booking.
   */
  async createReview(patientId: string, dto: CreateReviewDto): Promise<Review> {
    const rating = Math.round(dto.rating);
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    if (!dto.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    // 1. Verify booking exists on AWS RDS
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // 2. Enforce completed consultation status
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Reviews can only be submitted for completed consultations',
      );
    }

    // 3. Enforce patient ownership
    if (booking.patient_id !== patientId) {
      throw new ForbiddenException(
        'You are not authorized to review a consultation you did not attend',
      );
    }

    // 4. Enforce single review per booking
    const existing = await this.reviewRepository.findOne({
      where: { booking_id: dto.bookingId },
    });

    if (existing) {
      throw new ConflictException(
        'A review has already been submitted for this consultation booking',
      );
    }

    // 5. Save review on AWS RDS
    const review = this.reviewRepository.create({
      booking_id: booking.id,
      patient_id: patientId,
      doctor_id: booking.doctor_id,
      rating,
      comment: dto.comment?.trim() || null,
    });

    const saved = await this.reviewRepository.save(review);
    this.logger.log(
      `Review created: id=${saved.id} for booking=${booking.id}, doctor=${booking.doctor_id}, rating=${rating}`,
    );

    // 6. BE-902: Trigger Cross-DB Rating Recalculation
    await this.syncDoctorRating(booking.doctor_id);

    return saved;
  }

  /**
   * BE-902: Synchronizes average rating & review count from AWS RDS to VPS Postgres
   */
  async syncDoctorRating(doctorId: string): Promise<{ ratingAvg: number; reviewsCount: number }> {
    try {
      // Trigger async BullMQ job if queue available
      if (this.ratingSyncQueue) {
        try {
          await this.ratingSyncQueue.add('sync-doctor-rating', { doctorId });
        } catch (queueErr: any) {
          this.logger.warn(`Could not dispatch to rating sync queue: ${queueErr.message}`);
        }
      }

      // Synchronous calculation ensures immediate consistency
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

      this.logger.log(`Rating synced for doctor ${doctorId}: avg=${avg}, count=${count}`);
      return { ratingAvg: avg, reviewsCount: count };
    } catch (err: any) {
      this.logger.error(`Error syncing rating for doctor ${doctorId}: ${err.message}`);
      return { ratingAvg: 0, reviewsCount: 0 };
    }
  }

  /**
   * Retrieves review for a specific booking
   */
  async getBookingReview(bookingId: string): Promise<Review | null> {
    return this.reviewRepository.findOne({
      where: { booking_id: bookingId },
    });
  }

  /**
   * BE-901: Returns paginated public reviews for doctor profiles with distribution stats
   */
  async getDoctorReviews(
    doctorIdOrSlug: string,
    options?: { page?: number; limit?: number },
  ): Promise<DoctorReviewsResponse> {
    const page = Math.max(1, Number(options?.page || 1));
    const limit = Math.min(50, Math.max(1, Number(options?.limit || 10)));
    const skip = (page - 1) * limit;

    // Resolve doctor ID if slug provided
    let doctorId = doctorIdOrSlug;
    let doctor = await this.doctorProfileRepository.findOne({
      where: [{ id: doctorIdOrSlug }, { slug: doctorIdOrSlug }],
    });

    if (doctor) {
      doctorId = doctor.id;
    }

    // 1. Fetch paginated reviews from AWS RDS
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { doctor_id: doctorId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    // 2. Compute rating distribution and aggregate
    const allDoctorReviews = await this.reviewRepository.find({
      where: { doctor_id: doctorId },
      select: ['rating'],
    });

    const distribution: Record<number, { count: number; percentage: number }> = {
      5: { count: 0, percentage: 0 },
      4: { count: 0, percentage: 0 },
      3: { count: 0, percentage: 0 },
      2: { count: 0, percentage: 0 },
      1: { count: 0, percentage: 0 },
    };

    let totalScore = 0;
    for (const rev of allDoctorReviews) {
      const r = Math.min(5, Math.max(1, rev.rating));
      distribution[r].count += 1;
      totalScore += r;
    }

    const reviewsCount = allDoctorReviews.length;
    const ratingAvg =
      reviewsCount > 0 ? Number((totalScore / reviewsCount).toFixed(2)) : 0;

    for (let s = 1; s <= 5; s++) {
      distribution[s].percentage =
        reviewsCount > 0
          ? Math.round((distribution[s].count / reviewsCount) * 100)
          : 0;
    }

    // 3. Attach patient display initials/names from users table
    const patientIds = Array.from(new Set(reviews.map((r) => r.patient_id)));
    const patientMap: Record<string, string> = {};

    if (patientIds.length > 0) {
      try {
        const users = await this.userRepository
          .createQueryBuilder('user')
          .where('user.id IN (:...patientIds)', { patientIds })
          .getMany();

        for (const u of users) {
          // Mask for POPIA: "Sarah M." or "Verified Patient"
          if (u.full_name) {
            const parts = u.full_name.trim().split(' ');
            if (parts.length > 1) {
              patientMap[u.id] = `${parts[0]} ${parts[parts.length - 1][0]}.`;
            } else {
              patientMap[u.id] = parts[0];
            }
          }
        }
      } catch (e: any) {
        this.logger.debug(`Could not map patient names: ${e.message}`);
      }
    }

    const enhancedReviews = reviews.map((rev) => ({
      ...rev,
      patientName: patientMap[rev.patient_id] || 'Verified Patient',
    }));

    return {
      doctorId,
      ratingAvg,
      reviewsCount,
      distribution,
      reviews: enhancedReviews,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

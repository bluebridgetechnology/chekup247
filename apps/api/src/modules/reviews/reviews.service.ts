import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../database/patient/entities';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review, 'patient')
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async getDoctorReviews(doctorId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { doctor_id: doctorId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }
}

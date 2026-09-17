import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Review, Booking } from '../../database/patient/entities';
import { DoctorProfile, User } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';
import { AuthModule } from '../auth/auth.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Booking], 'patient'),
    TypeOrmModule.forFeature([DoctorProfile, User], 'operational'),
    BullModule.registerQueue({
      name: QUEUES.RATING_SYNC,
    }),
    AuthModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

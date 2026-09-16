import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService, CreateReviewDto } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { UserRole } from '../../database/operational/entities';
import { JwtPayload } from '../auth/token.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * BE-901: Patient Review Creation API (POST /reviews)
   * Restricts submission to completed consultations, one review per booking.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @Post()
  async submitReview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
    @Headers('x-patient-id') headerPatientId?: string,
  ) {
    const patientId = user?.sub || headerPatientId;
    return this.reviewsService.createReview(patientId, dto);
  }

  /**
   * Check review for specific booking (useful for post-consultation prompts)
   */
  @Public()
  @Get('booking/:bookingId')
  async getByBooking(@Param('bookingId') bookingId: string) {
    return this.reviewsService.getBookingReview(bookingId);
  }

  /**
   * BE-901: Paginated public doctor reviews with rating distribution
   */
  @Public()
  @Get('doctor/:doctorId')
  async getByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getDoctorReviews(doctorId, { page, limit });
  }
}

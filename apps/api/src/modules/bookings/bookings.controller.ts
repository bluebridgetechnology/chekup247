import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService, CreateBookingDto } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorators';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * BE-501: Booking Creation Saga Orchestrator.
   * Atomic slot reservation on VPS, booking record creation on AWS RDS,
   * with compensating rollback.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createBooking(
    @CurrentUser('id') patientId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBookingSaga(patientId, dto);
  }

  /**
   * BE-506: Get bookings for the currently authenticated patient.
   */
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  getMyBookings(@CurrentUser('id') patientId: string) {
    return this.bookingsService.getPatientBookings(patientId);
  }

  /**
   * BE-506: Get bookings for the currently authenticated doctor.
   */
  @UseGuards(JwtAuthGuard)
  @Get('doctor')
  getDoctorBookings(@CurrentUser('id') doctorUserId: string) {
    return this.bookingsService.getDoctorBookings(doctorUserId);
  }

  /**
   * Get bookings for a specific patient ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get('patient/:patientId')
  getPatientBookings(@Param('patientId') patientId: string) {
    return this.bookingsService.getPatientBookings(patientId);
  }

  /**
   * BE-506: Get detailed stitched booking by ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.getBookingById(id, userId);
  }

  /**
   * BE-507: Cancel booking and process refund.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.bookingsService.cancelBooking(id, userId, reason);
  }

  /**
   * BE-508: Trigger cross-database reconciliation job manually.
   */
  @UseGuards(JwtAuthGuard)
  @Post('reconcile')
  triggerReconciliation() {
    return this.bookingsService.reconcileDatabaseDrift();
  }
}

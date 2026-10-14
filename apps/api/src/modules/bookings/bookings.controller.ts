import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Delete,
  HttpException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService, CreateBookingDto } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';

/** Hold requests allowed per client IP per minute (anti-hoarding; single API instance). */
const HOLD_REQUESTS_PER_MINUTE = 10;
const holdRequestLog = new Map<string, number[]>();

function allowHoldRequest(key: string, now: number = Date.now()): boolean {
  const recent = (holdRequestLog.get(key) || []).filter((t) => now - t < 60000);
  if (recent.length >= HOLD_REQUESTS_PER_MINUTE) {
    holdRequestLog.set(key, recent);
    return false;
  }
  recent.push(now);
  holdRequestLog.set(key, recent);
  if (holdRequestLog.size > 5000) {
    for (const [k, v] of holdRequestLog) if (v.every((t) => now - t >= 60000)) holdRequestLog.delete(k);
  }
  return true;
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Reserve a time while the patient checks out (guests included). Returns a token the client sends
   * back when booking. Holds expire on their own; see booking.constants.ts.
   */
  @Public()
  @Post('holds')
  @HttpCode(HttpStatus.CREATED)
  holdSlot(@Body() dto: { slotId?: string; holdToken?: string }, @Req() req: any) {
    if (!dto?.slotId || typeof dto.slotId !== 'string') {
      throw new HttpException('slotId is required', HttpStatus.BAD_REQUEST);
    }
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown');
    if (!allowHoldRequest(ip)) {
      throw new HttpException('Too many requests. Please wait a moment.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.bookingsService.holdSlot(dto.slotId, dto.holdToken);
  }

  /** Exchange the emailed "Join your consultation" link for a guest session limited to that booking. */
  @Public()
  @Post('join-link')
  @HttpCode(HttpStatus.OK)
  exchangeJoinLink(@Body() dto: { token?: string }, @Req() req: any) {
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown');
    if (!allowHoldRequest(`join:${ip}`)) {
      throw new HttpException('Too many requests. Please wait a moment.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.bookingsService.exchangeJoinLink(String(dto?.token || ''));
  }

  /** Release a hold early. Only the holder's token works. */
  @Public()
  @Delete('holds/:slotId')
  releaseHold(@Param('slotId') slotId: string, @Query('token') token: string) {
    return this.bookingsService.releaseHold(slotId, token);
  }

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
   * BE-801: Cancel booking and process refund or credit based on 24h threshold.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { reason?: string; action?: 'refund' | 'credit' },
  ) {
    return this.bookingsService.cancelBooking(
      id,
      userId,
      dto?.reason,
      dto?.action || 'refund',
    );
  }

  /**
   * BE-802: Reschedule appointment to another open slot.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/reschedule')
  rescheduleBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { newSlotId: string; reason?: string },
  ) {
    return this.bookingsService.rescheduleBooking(id, userId, dto);
  }

  /**
   * Update clinical intake, reason, notes, or uploaded test reports for a booking.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/intake')
  updateBookingIntake(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { notes?: string; reasonCategory?: string; attachments?: any[] },
  ) {
    return this.bookingsService.updateBookingIntake(id, userId, dto);
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

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class JoinConsultationDto {
  @IsOptional()
  @IsIn(['doctor', 'patient'])
  role?: 'doctor' | 'patient';

  @IsOptional()
  @IsString()
  userName?: string;
}

export class SaveNotesDto {
  @IsString()
  notes: string;
}

export class EndConsultationDto {
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  doctorNotes?: string;
}

export class RequestExtensionDto {
  @IsNumber()
  durationMinutes: number;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsString()
  doctorId?: string;
}

export class ConsentExtensionDto {
  @IsString()
  extensionId: string;

  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  patientId?: string;
}

import { AuditService } from '../audit/audit.service';
import { Req } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorators';

@Controller('consultations')
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Health Notes: Retrieves post-consultation recommendations & care instructions
   * specifically for the calling patient, linking to any associated prescription.
   */
  @UseGuards(JwtAuthGuard)
  @Get('patient-notes/mine')
  async getMyHealthNotes(@CurrentUser() user: any) {
    return this.consultationsService.getPatientHealthNotes(user.sub || user.id);
  }

  /**
   * Health Notes: Retrieves post-consultation recommendations by patient ID (for care team).
   */
  @UseGuards(JwtAuthGuard)
  @Get('patient-notes/:patientId')
  async getPatientHealthNotes(@Param('patientId') patientId: string) {
    return this.consultationsService.getPatientHealthNotes(patientId);
  }

  /**
   * Backward-compatible booking lookup.
   */
  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  getByBooking(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getConsultationDetails(bookingId);
  }

  /**
   * Public lightweight status check for consultation lifecycle (polling fallback).
   * Unauthenticated so guest/express patients can reliably detect meeting end.
   */
  @Get(':bookingId/status')
  getConsultationStatus(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getConsultationStatus(bookingId);
  }

  /**
   * Retrieves consultation room details & status (BE-602).
   */
  @Get(':bookingId')
  @UseGuards(JwtAuthGuard)
  getConsultation(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getConsultationDetails(bookingId);
  }

  /**
   * Join consultation call session (BE-602).
   * Stamps started_at on first join, returns Daily meeting token.
   */
  @Post(':bookingId/join')
  @UseGuards(JwtAuthGuard)
  joinConsultation(
    @Param('bookingId') bookingId: string,
    @Body() dto: JoinConsultationDto,
    @CurrentUser() user: any,
  ) {
    const role = user?.role === 'doctor' ? 'doctor' : 'patient';
    return this.consultationsService.joinConsultation(
      bookingId,
      role,
      dto.userName,
      user?.sub || user?.id,
    );
  }

  /**
   * Concludes consultation (BE-602).
   * Transitions status to COMPLETED, enables prescription eligibility,
   * and broadcasts disconnect to all participants.
   */
  @Post(':bookingId/end')
  @UseGuards(JwtAuthGuard)
  endConsultation(
    @Param('bookingId') bookingId: string,
    @Body() dto: EndConsultationDto,
    @Req() req: any,
  ) {
    const doctorId = dto.doctorId || req?.user?.id || 'system-doctor';
    return this.consultationsService.endConsultation(bookingId, doctorId, dto.doctorNotes);
  }

  /**
   * Saves doctor private clinical consultation notes to RDS (BE-605, BE-907).
   */
  @Put(':bookingId/notes')
  @UseGuards(JwtAuthGuard)
  async saveNotes(
    @Param('bookingId') bookingId: string,
    @Body() dto: SaveNotesDto,
    @Req() req: Request,
  ) {
    if (typeof dto.notes !== 'string') {
      throw new BadRequestException('Notes content must be a string');
    }
    const result = await this.consultationsService.saveDoctorNotes(bookingId, dto.notes);

    await this.auditService.logHealthRecordAccess({
      patientId: result?.booking?.patient_id,
      action: 'UPDATE_CONSULTATION_NOTES',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: {
        bookingId,
        notesLength: dto.notes.length,
      },
    });

    return result;
  }

  /**
   * Direct room provisioning endpoint (BE-601).
   */
  @Post(':bookingId/provision')
  @UseGuards(JwtAuthGuard)
  provisionRoom(@Param('bookingId') bookingId: string) {
    return this.consultationsService.provisionRoom(bookingId);
  }

  /**
   * Doctor requests an in-call consultation time extension (BE-701).
   * Duration is 10, 20, or 30 minutes; the price is derived server-side pro-rata
   * from the doctor's own hourly rate. Checks next slot on VPS operational DB;
   * emits WebSocket 'extension_requested'.
   */
  @Post(':bookingId/extend')
  @UseGuards(JwtAuthGuard)
  requestExtension(
    @Param('bookingId') bookingId: string,
    @Body() dto: RequestExtensionDto,
  ) {
    if (!dto.durationMinutes) {
      throw new BadRequestException('durationMinutes (10, 20, or 30) is required');
    }
    return this.consultationsService.requestExtension(
      bookingId,
      Number(dto.durationMinutes),
      dto.doctorId,
      dto.isFree === true,
    );
  }

  /**
   * Patient submits consent for time extension (BE-701).
   * If approved & paid: returns a Paystack `authorization_url` for the client to
   * open in a new tab. The call is only extended once Paystack confirms the charge
   * via the webhook — NO stored card, NO auto-debit. A complimentary (zero-amount)
   * extension is finalized inline.
   */
  @Post(':bookingId/extend/consent')
  @UseGuards(JwtAuthGuard)
  consentExtension(
    @Param('bookingId') bookingId: string,
    @Body() dto: ConsentExtensionDto,
  ) {
    if (!dto.extensionId || typeof dto.approved !== 'boolean') {
      throw new BadRequestException('extensionId and approved boolean are required');
    }
    return this.consultationsService.consentExtension(
      bookingId,
      dto.extensionId,
      dto.approved,
      dto.patientId,
    );
  }

  /**
   * Retrieves all extensions for a consultation.
   */
  @Get(':bookingId/extensions')
  @UseGuards(JwtAuthGuard)
  getExtensions(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getExtensions(bookingId);
  }

  /**
   * Daily.co Webhook Handler (participant.joined, participant.left, etc.).
   */
  @Post('webhooks/daily')
  handleDailyWebhook(@Body() payload: any) {
    return this.consultationsService.handleDailyWebhook(payload);
  }
}

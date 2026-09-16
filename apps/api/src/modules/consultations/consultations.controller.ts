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

export class JoinConsultationDto {
  role?: 'doctor' | 'patient';
  userName?: string;
}

export class SaveNotesDto {
  notes: string;
}

export class EndConsultationDto {
  doctorId?: string;
}

export class RequestExtensionDto {
  durationMinutes: number;
  doctorId?: string;
}

export class ConsentExtensionDto {
  extensionId: string;
  approved: boolean;
  patientId?: string;
}

import { AuditService } from '../audit/audit.service';
import { Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('consultations')
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Backward-compatible booking lookup.
   */
  @Get('booking/:bookingId')
  getByBooking(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getConsultationDetails(bookingId);
  }

  /**
   * Retrieves consultation room details & status (BE-602).
   */
  @Get(':bookingId')
  getConsultation(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getConsultationDetails(bookingId);
  }

  /**
   * Join consultation call session (BE-602).
   * Stamps started_at on first join, returns Daily meeting token.
   */
  @Post(':bookingId/join')
  joinConsultation(
    @Param('bookingId') bookingId: string,
    @Body() dto: JoinConsultationDto,
  ) {
    const role = dto.role || 'patient';
    return this.consultationsService.joinConsultation(
      bookingId,
      role,
      dto.userName,
    );
  }

  /**
   * Concludes consultation (BE-602).
   * Transitions status to COMPLETED, enables prescription eligibility,
   * and broadcasts disconnect to all participants.
   */
  @Post(':bookingId/end')
  endConsultation(
    @Param('bookingId') bookingId: string,
    @Body() dto: EndConsultationDto,
  ) {
    const doctorId = dto.doctorId || 'system-doctor';
    return this.consultationsService.endConsultation(bookingId, doctorId);
  }

  /**
   * Saves doctor private clinical consultation notes to RDS (BE-605, BE-907).
   */
  @Put(':bookingId/notes')
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
  provisionRoom(@Param('bookingId') bookingId: string) {
    return this.consultationsService.provisionRoom(bookingId);
  }

  /**
   * Doctor requests an in-call consultation time extension (BE-701).
   * Checks next slot on VPS operational DB; emits WebSocket 'extension_requested'.
   */
  @Post(':bookingId/extend')
  requestExtension(
    @Param('bookingId') bookingId: string,
    @Body() dto: RequestExtensionDto,
  ) {
    if (!dto.durationMinutes) {
      throw new BadRequestException('durationMinutes (15, 20, or 30) is required');
    }
    return this.consultationsService.requestExtension(
      bookingId,
      Number(dto.durationMinutes),
      dto.doctorId,
    );
  }

  /**
   * Patient submits consent for time extension (BE-701).
   * If approved: auto-debits vaulted card and extends Daily.co room.
   */
  @Post(':bookingId/extend/consent')
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
  getExtensions(@Param('bookingId') bookingId: string) {
    return this.consultationsService.getExtensions(bookingId);
  }
}

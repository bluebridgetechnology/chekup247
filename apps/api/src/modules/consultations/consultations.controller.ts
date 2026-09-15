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

@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

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
   * Saves doctor private clinical consultation notes to RDS (BE-605).
   */
  @Put(':bookingId/notes')
  saveNotes(
    @Param('bookingId') bookingId: string,
    @Body() dto: SaveNotesDto,
  ) {
    if (typeof dto.notes !== 'string') {
      throw new BadRequestException('Notes content must be a string');
    }
    return this.consultationsService.saveDoctorNotes(bookingId, dto.notes);
  }

  /**
   * Direct room provisioning endpoint (BE-601).
   */
  @Post(':bookingId/provision')
  provisionRoom(@Param('bookingId') bookingId: string) {
    return this.consultationsService.provisionRoom(bookingId);
  }
}

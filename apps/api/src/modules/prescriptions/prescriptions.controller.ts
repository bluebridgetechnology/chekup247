import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrescriptionsService, CreatePrescriptionDto } from './prescriptions.service';
import { Public } from '../../common/decorators/auth.decorators';

export class CreatePrescriptionRequestDto {
  consultationId?: string;
  bookingId?: string;
  doctorId?: string;
  icd10Code: string;
  medications: Array<{
    name: string;
    dosage: string;
    duration: string;
    instructions: string;
    nappi_code?: string;
    schedule_flag?: string;
    frequency?: string;
  }>;
  scheduleFlag?: string;
  supervisionDeclaration?: string;
}

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  /**
   * Creates an E-Prescription following consultation (BE-702, BE-703, BE-706, BE-707).
   */
  @Post()
  createPrescription(
    @Body() dto: CreatePrescriptionRequestDto,
    @Headers('x-doctor-id') headerDoctorId?: string,
  ) {
    const doctorId = dto.doctorId || headerDoctorId || 'system-doctor';
    return this.prescriptionsService.createPrescription(doctorId, dto);
  }

  /**
   * Retrieves all prescriptions for a patient (PA-703).
   */
  @Get('patient/:patientId')
  getPatientPrescriptions(@Param('patientId') patientId: string) {
    return this.prescriptionsService.getPatientPrescriptions(patientId);
  }

  /**
   * Retrieves single prescription details.
   */
  @Get(':id')
  getPrescription(@Param('id') id: string) {
    return this.prescriptionsService.getPrescriptionById(id);
  }

  /**
   * Downloads official signed E-Prescription PDF (BE-706, PA-703).
   */
  @Public()
  @Get(':id/download')
  async downloadPrescriptionPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.prescriptionsService.getPrescriptionPdfBuffer(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  }
}

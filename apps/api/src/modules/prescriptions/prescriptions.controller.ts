import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  Headers,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrescriptionsService, CreatePrescriptionDto } from './prescriptions.service';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';

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
  symptoms?: string[];
  clinicalNotes?: string;
}

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates an E-Prescription following consultation (BE-702, BE-703, BE-706, BE-707, BE-907).
   */
  @Post()
  async createPrescription(
    @Body() dto: CreatePrescriptionRequestDto,
    @Req() req: Request,
    @Headers('x-doctor-id') headerDoctorId?: string,
  ) {
    const doctorId = dto.doctorId || headerDoctorId || 'system-doctor';
    const result = await this.prescriptionsService.createPrescription(doctorId, dto);

    await this.auditService.logHealthRecordAccess({
      userId: doctorId,
      userRole: 'doctor',
      patientId: result.patient_id,
      action: 'CREATE_PRESCRIPTION',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: {
        prescriptionId: result.id,
        icd10Code: dto.icd10Code,
        scheduleFlag: dto.scheduleFlag,
        medicationsCount: dto.medications?.length || 0,
      },
    });

    return result;
  }

  /**
   * Retrieves all prescriptions issued by the doctor (DR-701).
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getDoctorPrescriptions(
    @Query('doctorId') queryDoctorId?: string,
    @Headers('x-doctor-id') headerDoctorId?: string,
    @CurrentUser('id') currentUserId?: string,
    @Req() req?: Request,
  ) {
    const doctorId = queryDoctorId || headerDoctorId || currentUserId || (req as any)?.user?.sub;
    return this.prescriptionsService.getDoctorPrescriptions(doctorId);
  }

  /**
   * Revokes an existing prescription (DR-702).
   */
  @Post(':id/revoke')
  async revokePrescription(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Headers('x-doctor-id') headerDoctorId?: string,
    @Req() req?: Request,
  ) {
    const doctorId = headerDoctorId || (req as any)?.user?.sub || 'system-doctor';
    const result = await this.prescriptionsService.revokePrescription(doctorId, id, reason || 'Revoked by practitioner');

    await this.auditService.logHealthRecordAccess({
      userId: doctorId,
      userRole: 'doctor',
      patientId: (result as any)?.patient_id,
      action: 'REVOKE_PRESCRIPTION',
      ipAddress: req?.ip || (req?.headers?.['x-forwarded-for'] as string),
      userAgent: req?.headers?.['user-agent'],
      metadata: {
        prescriptionId: id,
        reason,
      },
    });

    return result;
  }

  /**
   * Retrieves all prescriptions for a patient (PA-703, BE-907).
   */
  @Get('patient/:patientId')
  async getPatientPrescriptions(
    @Param('patientId') patientId: string,
    @Req() req: Request,
  ) {
    const result = await this.prescriptionsService.getPatientPrescriptions(patientId);

    await this.auditService.logHealthRecordAccess({
      patientId,
      action: 'VIEW_PATIENT_PRESCRIPTIONS_LIST',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { count: result.length },
    });

    return result;
  }

  /**
   * Retrieves single prescription details (BE-907).
   */
  @Get(':id')
  async getPrescription(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.prescriptionsService.getPrescriptionById(id);

    await this.auditService.logHealthRecordAccess({
      patientId: result?.patient_id,
      action: 'VIEW_PRESCRIPTION_DETAIL',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { prescriptionId: id },
    });

    return result;
  }

  /**
   * Downloads official signed E-Prescription PDF (BE-706, PA-703, BE-907).
   */
  @Public()
  @Get(':id/download')
  async downloadPrescriptionPdf(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.prescriptionsService.getPrescriptionPdfBuffer(id);

    await this.auditService.logHealthRecordAccess({
      action: 'DOWNLOAD_PRESCRIPTION_PDF',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { prescriptionId: id, filename },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  }

  /**
   * Public verification endpoint for anyone scanning prescription QR code (BE-907, PA-703).
   */
  @Public()
  @Get(':id/verify')
  async verifyPrescription(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.prescriptionsService.getPublicPrescriptionById(id);

    await this.auditService.logHealthRecordAccess({
      action: 'PUBLIC_VERIFY_PRESCRIPTION',
      patientId: result?.patient?.patient_id,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { prescriptionId: id },
    });

    return result;
  }
}

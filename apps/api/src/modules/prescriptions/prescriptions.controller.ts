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
  ForbiddenException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PrescriptionsService, CreatePrescriptionDto } from './prescriptions.service';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { PatientAccessService } from '../patient-records/patient-access.service';

export class PrescriptionMedicationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  dosage: string;

  @IsOptional()
  @IsString()
  duration: string;

  @IsOptional()
  @IsString()
  instructions: string;

  @IsOptional()
  @IsString()
  nappi_code?: string;

  @IsOptional()
  @IsString()
  schedule_flag?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsNumber()
  repeats?: number;
}

export class RecommendedLabTestDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  indication?: string;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  fasting?: boolean;
}

export class CreatePrescriptionRequestDto {
  @IsOptional()
  @IsString()
  consultationId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsString()
  icd10Code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionMedicationDto)
  medications: PrescriptionMedicationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendedLabTestDto)
  recommendedLabTests?: RecommendedLabTestDto[];

  @IsOptional()
  @IsString()
  scheduleFlag?: string;

  @IsOptional()
  @IsString()
  supervisionDeclaration?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @IsOptional()
  @IsString()
  clinicalNotes?: string;
}

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly auditService: AuditService,
    private readonly patientAccess: PatientAccessService,
  ) {}

  /**
   * Creates an E-Prescription following consultation (BE-702, BE-703, BE-706, BE-707, BE-907).
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPrescription(
    @Body() dto: CreatePrescriptionRequestDto,
    @Req() req: Request,
    @CurrentUser() user: any,
  ) {
    // The prescriber is always the authenticated doctor, never a client-supplied id
    if (!this.patientAccess.isDoctor(user)) {
      throw new ForbiddenException('Only doctors can issue prescriptions');
    }
    const doctorId = this.patientAccess.userId(user)!;
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
    @CurrentUser() user?: any,
  ) {
    // Doctors only ever see their own prescriptions; admins may look up a specific doctor
    const doctorId = this.patientAccess.isAdmin(user)
      ? queryDoctorId || undefined
      : this.patientAccess.userId(user) || undefined;
    return this.prescriptionsService.getDoctorPrescriptions(doctorId);
  }

  /**
   * Revokes an existing prescription (DR-702).
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  async revokePrescription(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
    @Req() req?: Request,
  ) {
    const existing = await this.prescriptionsService.getPrescriptionById(id);
    await this.patientAccess.assertIssuingDoctor(user, existing.doctor_id);
    const doctorId = this.patientAccess.userId(user)!;
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
  @UseGuards(JwtAuthGuard)
  @Get('patient/:patientId')
  async getPatientPrescriptions(
    @Param('patientId') patientId: string,
    @Req() req: Request,
    @CurrentUser() user: any,
  ) {
    await this.patientAccess.assertPatientAccess(user, patientId);
    const result = await this.prescriptionsService.getPatientPrescriptions(patientId);

    await this.auditService.logHealthRecordAccess({
      userId: this.patientAccess.userId(user) || undefined,
      userRole: user?.role,
      patientId,
      action: 'VIEW_PATIENT_PRESCRIPTIONS_LIST',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { count: result.length },
    });

    return result;
  }

  /**
   * Retrieves prescription for a specific booking or consultation (BE-706, PA-703).
   */
  @Public()
  @Get('booking/:bookingId')
  async getPrescriptionByBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: Request,
  ) {
    const result = await this.prescriptionsService.getPrescriptionByBookingId(bookingId);
    return { prescription: result };
  }

  /**
   * Direct PDF download for a specific booking (PA-703, BE-907).
   */
  @Public()
  @Get('booking/:bookingId/download')
  async downloadPrescriptionPdfByBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const prescription = await this.prescriptionsService.getPrescriptionByBookingId(bookingId);
    if (!prescription) {
      throw new BadRequestException(`No prescription issued for booking ${bookingId}`);
    }
    const { buffer, filename } = await this.prescriptionsService.getPrescriptionPdfBuffer(prescription.id);

    await this.auditService.logHealthRecordAccess({
      action: 'DOWNLOAD_PRESCRIPTION_PDF_BY_BOOKING',
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { bookingId, prescriptionId: prescription.id, filename },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  }

  /**
   * Retrieves single prescription details (BE-907).
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPrescription(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: any,
  ) {
    const result = await this.prescriptionsService.getPrescriptionById(id);
    await this.patientAccess.assertPatientAccess(user, result.patient_id);

    await this.auditService.logHealthRecordAccess({
      userId: this.patientAccess.userId(user) || undefined,
      userRole: user?.role,
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

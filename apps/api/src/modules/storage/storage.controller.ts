import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { envConfig } from '../../config/env.config';
import { PatientDocument, PatientDocumentCategory } from '../../database/patient/entities';

export class GetPresignedUrlDto {
  filename: string;
  contentType: string;
  category?: 'lab_report' | 'prescription' | 'id_document' | 'other';
  scope?: 'patient' | 'doctor';
}

export class CreateDocumentDto {
  title: string;
  originalFilename: string;
  category?: PatientDocumentCategory;
  s3Key: string;
  fileSize?: number;
  mimeType: string;
  notes?: string;
  bookingId?: string;
}

@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(PatientDocument, 'patient')
    private readonly documentRepository: Repository<PatientDocument>,
  ) {}

  /**
   * Generates an S3 presigned PUT URL for client-side document/test report upload.
   */
  @UseGuards(JwtAuthGuard)
  @Post('presigned-upload')
  async getPresignedUpload(
    @CurrentUser('id') userId: string,
    @Body() dto: GetPresignedUrlDto,
  ) {
    if (!dto.filename || !dto.contentType) {
      throw new BadRequestException('filename and contentType are required');
    }

    const sanitizedName = dto.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const category = dto.category || 'lab_report';
    const scopePrefix = dto.scope === 'doctor' ? 'doctor-records' : 'patient-records';
    const key = `${scopePrefix}/${userId}/${category}/${timestamp}-${sanitizedName}`;

    const presigned = await this.storageService.getPresignedUploadUrl(
      envConfig.STORAGE_BUCKET_DOCUMENTS,
      key,
      dto.contentType,
    );

    const publicUrl = `${envConfig.STORAGE_ENDPOINT}/${envConfig.STORAGE_BUCKET_DOCUMENTS}/${key}`;

    return {
      ...presigned,
      fileUrl: publicUrl,
      bucket: envConfig.STORAGE_BUCKET_DOCUMENTS,
    };
  }

  /**
   * Records uploaded medical document/test report metadata in the Patient DB.
   */
  @UseGuards(JwtAuthGuard)
  @Post('documents')
  async saveDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    if (!dto.title || !dto.s3Key || !dto.originalFilename) {
      throw new BadRequestException('title, s3Key, and originalFilename are required');
    }

    const doc = this.documentRepository.create({
      patient_id: userId,
      title: dto.title,
      original_filename: dto.originalFilename,
      category: dto.category || PatientDocumentCategory.LAB_REPORT,
      s3_key: dto.s3Key,
      file_size: dto.fileSize || 0,
      mime_type: dto.mimeType || 'application/pdf',
      notes: dto.notes || null,
      booking_id: dto.bookingId || null,
    });

    const saved = await this.documentRepository.save(doc);

    // Generate signed download URL
    const { downloadUrl } = await this.storageService.getPresignedDownloadUrl(
      envConfig.STORAGE_BUCKET_DOCUMENTS,
      saved.s3_key,
    );

    return {
      ...saved,
      downloadUrl,
    };
  }

  /**
   * Retrieves all medical documents / test reports for the calling patient.
   */
  @UseGuards(JwtAuthGuard)
  @Get('documents/mine')
  async getMyDocuments(@CurrentUser('id') userId: string) {
    await this.seedDemoDocumentsIfEmpty(userId);

    const docs = await this.documentRepository.find({
      where: { patient_id: userId },
      order: { created_at: 'DESC' },
    });

    // Populate signed download URLs
    return Promise.all(
      docs.map(async (doc) => {
        let downloadUrl: string | null = null;
        try {
          const res = await this.storageService.getPresignedDownloadUrl(
            envConfig.STORAGE_BUCKET_DOCUMENTS,
            doc.s3_key,
          );
          downloadUrl = res.downloadUrl;
        } catch {
          downloadUrl = null;
        }
        return {
          ...doc,
          downloadUrl,
        };
      }),
    );
  }

  /**
   * Doctor / Care Team: Retrieves test reports uploaded by a specific patient.
   */
  @UseGuards(JwtAuthGuard)
  @Get('documents/patient/:patientId')
  async getPatientDocuments(@Param('patientId') patientId: string) {
    await this.seedDemoDocumentsIfEmpty(patientId);

    const docs = await this.documentRepository.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
    });

    return Promise.all(
      docs.map(async (doc) => {
        let downloadUrl: string | null = null;
        try {
          const res = await this.storageService.getPresignedDownloadUrl(
            envConfig.STORAGE_BUCKET_DOCUMENTS,
            doc.s3_key,
          );
          downloadUrl = res.downloadUrl;
        } catch {
          downloadUrl = null;
        }
        return {
          ...doc,
          downloadUrl,
        };
      }),
    );
  }

  private async seedDemoDocumentsIfEmpty(userId: string) {
    try {
      const count = await this.documentRepository.count({ where: { patient_id: userId } });
      if (count > 0) return;

      const demoDocs = [
        {
          patient_id: userId,
          title: 'PathCare Full Blood Count (FBC) & CRP Panel',
          original_filename: 'PathCare_FBC_CRP_Report_2026.pdf',
          category: PatientDocumentCategory.LAB_REPORT,
          file_size: 245760,
          mime_type: 'application/pdf',
          s3_key: `patient-records/${userId}/lab_report/PathCare_FBC_CRP_Report_2026.pdf`,
          notes: 'Full blood count, differential white cell count, and C-reactive protein panel.',
        },
        {
          patient_id: userId,
          title: 'Right Knee Diagnostic MRI Radiology Scan Report',
          original_filename: 'Right_Knee_MRI_Diagnostic.pdf',
          category: PatientDocumentCategory.IMAGING,
          file_size: 1428500,
          mime_type: 'application/pdf',
          s3_key: `patient-records/${userId}/imaging/Right_Knee_MRI_Diagnostic.pdf`,
          notes: 'High-resolution coronal and sagittal MRI views with radiologist findings.',
        },
        {
          patient_id: userId,
          title: 'Mediclinic Cape Town Day-Ward Discharge Summary',
          original_filename: 'Mediclinic_Discharge_Summary.pdf',
          category: PatientDocumentCategory.DISCHARGE_SUMMARY,
          file_size: 512000,
          mime_type: 'application/pdf',
          s3_key: `patient-records/${userId}/discharge_summary/Mediclinic_Discharge_Summary.pdf`,
          notes: 'Day-ward observation chart and clinical discharge recommendations.',
        },
        {
          patient_id: userId,
          title: 'Lancet Laboratories Fasting Lipogram & HbA1c Panel',
          original_filename: 'Lancet_Lipid_HbA1c_Panel.pdf',
          category: PatientDocumentCategory.LAB_REPORT,
          file_size: 184320,
          mime_type: 'application/pdf',
          s3_key: `patient-records/${userId}/lab_report/Lancet_Lipid_HbA1c_Panel.pdf`,
          notes: 'Fasting lipid profile, cholesterol breakdown, and HbA1c glycemic control check.',
        },
      ];

      for (const d of demoDocs) {
        const item = this.documentRepository.create(d);
        await this.documentRepository.save(item);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Deletes an uploaded medical document record.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('documents/:id')
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') docId: string,
  ) {
    const doc = await this.documentRepository.findOne({
      where: { id: docId, patient_id: userId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found or unauthorized');
    }

    await this.documentRepository.remove(doc);
    return { success: true, message: 'Document removed successfully' };
  }
}

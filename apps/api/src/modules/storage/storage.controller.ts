import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { envConfig } from '../../config/env.config';

export class GetPresignedUrlDto {
  filename: string;
  contentType: string;
  category?: 'lab_report' | 'prescription' | 'id_document' | 'other';
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

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
    const key = `patient-records/${userId}/${category}/${timestamp}-${sanitizedName}`;

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
}

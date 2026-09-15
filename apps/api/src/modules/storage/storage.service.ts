import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envConfig } from '../../config/env.config';

export type AllowedMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

const ALLOWED_MIME_TYPES: AllowedMimeType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    this.s3Client = new S3Client({
      region: envConfig.STORAGE_REGION,
      endpoint: envConfig.STORAGE_ENDPOINT,
      forcePathStyle: envConfig.STORAGE_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: envConfig.STORAGE_ACCESS_KEY,
        secretAccessKey: envConfig.STORAGE_SECRET_KEY,
      },
    });
  }

  /**
   * Generates a pre-signed PUT URL for direct client-side upload
   */
  async getPresignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresInSeconds = 900, // 15 minutes
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
      throw new BadRequestException(
        `Unsupported MIME type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      key,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Generates an expiring pre-signed GET URL for secure download
   */
  async getPresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 3600, // 1 hour
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      downloadUrl,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Checks S3 / MinIO connectivity for health checks
   */
  async ping(): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: envConfig.STORAGE_BUCKET_DOCUMENTS,
        }),
      );
      return true;
    } catch (error: any) {
      // If bucket doesn't exist yet or is reachable with 404/403, S3 service is online
      if (error?.$metadata?.httpStatusCode) {
        return true;
      }
      this.logger.warn(`Storage ping failed: ${error.message}`);
      return false;
    }
  }
}

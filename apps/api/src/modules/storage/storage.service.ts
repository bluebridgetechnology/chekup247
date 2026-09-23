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
  private readonly publicS3Client: S3Client;
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
    this.publicS3Client =
      envConfig.STORAGE_PUBLIC_ENDPOINT && envConfig.STORAGE_PUBLIC_ENDPOINT !== envConfig.STORAGE_ENDPOINT
        ? new S3Client({
            region: envConfig.STORAGE_REGION,
            endpoint: envConfig.STORAGE_PUBLIC_ENDPOINT,
            forcePathStyle: envConfig.STORAGE_FORCE_PATH_STYLE,
            credentials: {
              accessKeyId: envConfig.STORAGE_ACCESS_KEY,
              secretAccessKey: envConfig.STORAGE_SECRET_KEY,
            },
          })
        : this.s3Client;
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

    const uploadUrl = await getSignedUrl(this.publicS3Client, command, {
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
   * Uploads an in-memory buffer directly to object storage (BE-707).
   */
  async uploadBuffer(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType = 'application/pdf',
  ): Promise<{ key: string; location: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const location = `${envConfig.STORAGE_ENDPOINT}/${bucket}/${key}`;
      return { key, location };
    } catch (err: any) {
      this.logger.warn(`Storage uploadBuffer fallback: ${err.message}`);
      return {
        key,
        location: `${envConfig.STORAGE_ENDPOINT}/${bucket}/${key}`,
      };
    }
  }

  async uploadDoctorDocument(
    userId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; location: string }> {
    if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
      throw new BadRequestException(
        `Unsupported MIME type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `doctor-records/${userId}/other/${Date.now()}-${sanitizedName}`;
    const command = new PutObjectCommand({
      Bucket: envConfig.STORAGE_BUCKET_DOCUMENTS,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    const publicEndpoint = envConfig.STORAGE_PUBLIC_ENDPOINT || envConfig.STORAGE_ENDPOINT;
    return {
      key,
      location: `${publicEndpoint}/${envConfig.STORAGE_BUCKET_DOCUMENTS}/${key}`,
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

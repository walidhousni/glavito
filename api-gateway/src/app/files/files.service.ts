import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UsageTrackingService } from '../usage/usage-tracking.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private s3?: S3Client;

  constructor(
    private readonly config: ConfigService,
    private readonly usageTracking: UsageTrackingService,
  ) {
    const bucket = this.config.get<string>('S3_BUCKET');
    const region = this.config.get<string>('S3_REGION');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY');
    if (bucket && region && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async uploadFile(file: Express.Multer.File, options?: { folder?: string; tenantId?: string; resourceType?: 'file_upload' | 'brand_asset' | 'data_import' | 'attachment' }) {
    if (!file) {
      throw new Error('No file provided');
    }

    const originalName = file.originalname || 'file';
    const ext = path.extname(originalName);
    const key = `${options?.folder || 'uploads'}/${randomUUID()}${ext}`;

    if (this.s3 && this.config.get<string>('S3_BUCKET')) {
      // Optional: antivirus scan placeholder hook
      try {
        const enableScan = this.config.get<string>('ANTIVIRUS_SCAN_ENABLED') === 'true';
        if (enableScan) {
          // In production, integrate with ClamAV/Lambda scanning here
        }
      } catch {
        // ignore scanning errors
      }

      const bucket = this.config.get<string>('S3_BUCKET')!;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'private',
        })
      );
      const url = await this.buildSignedUrl(bucket, key, parseInt(this.config.get<string>('UPLOAD_URL_TTL_SECONDS') || '3600', 10));
      const result = { storage: 's3', key, url, size: file.size, mimeType: file.mimetype };
      
      // Track storage usage if tenantId is provided
      if (options?.tenantId) {
        await this.usageTracking.trackStorageUsage({
          tenantId: options.tenantId,
          resourceType: options.resourceType || 'file_upload',
          fileName: originalName,
          fileSize: file.size,
          storageType: 's3',
          bucket,
          key,
          mimeType: file.mimetype,
          metadata: { folder: options.folder },
        });
      }
      
      return result;
    }

    const uploadRoot = this.config.get<string>('UPLOAD_PATH') || path.resolve(process.cwd(), 'uploads');
    const targetPath = path.join(uploadRoot, key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.buffer);
    const publicBase = this.config.get<string>('PUBLIC_UPLOAD_BASE_URL') || '';
    const url = publicBase ? `${publicBase}/${key}` : `/uploads/${key}`;
    const result = { storage: 'local', key, url, size: file.size, mimeType: file.mimetype };
    
    // Track storage usage if tenantId is provided
    if (options?.tenantId) {
      await this.usageTracking.trackStorageUsage({
        tenantId: options.tenantId,
        resourceType: options.resourceType || 'file_upload',
        fileName: originalName,
        fileSize: file.size,
        storageType: 'local',
        key,
        mimeType: file.mimetype,
        metadata: { folder: options.folder, uploadPath: uploadRoot },
      });
    }
    
    return result;
  }

  /**
   * Persist an in-memory buffer as an object (S3 or local), returning a URL similar to uploadFile
   */
  async saveBuffer(buffer: Buffer, opts?: { folder?: string; filename?: string; contentType?: string; tenantId?: string; resourceType?: 'file_upload' | 'brand_asset' | 'data_import' | 'attachment' }) {
    const folder = opts?.folder || 'uploads';
    const ext = opts?.filename ? path.extname(opts.filename) : '';
    const key = `${folder}/${randomUUID()}${ext}`;

    if (this.s3 && this.config.get<string>('S3_BUCKET')) {
      const bucket = this.config.get<string>('S3_BUCKET')!;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: opts?.contentType || 'application/octet-stream',
          ACL: 'private',
        })
      );
      const url = await this.buildSignedUrl(bucket, key, parseInt(this.config.get<string>('UPLOAD_URL_TTL_SECONDS') || '3600', 10));
      const result = { storage: 's3', key, url, size: buffer.length, mimeType: opts?.contentType || 'application/octet-stream' };
      
      // Track storage usage if tenantId is provided
      if (opts?.tenantId) {
        await this.usageTracking.trackStorageUsage({
          tenantId: opts.tenantId,
          resourceType: opts.resourceType || 'file_upload',
          fileName: opts.filename,
          fileSize: buffer.length,
          storageType: 's3',
          bucket,
          key,
          mimeType: opts.contentType || 'application/octet-stream',
          metadata: { folder },
        });
      }
      
      return result;
    }

    const uploadRoot = this.config.get<string>('UPLOAD_PATH') || path.resolve(process.cwd(), 'uploads');
    const targetPath = path.join(uploadRoot, key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, buffer);
    const publicBase = this.config.get<string>('PUBLIC_UPLOAD_BASE_URL') || '';
    const url = publicBase ? `${publicBase}/${key}` : `/uploads/${key}`;
    const result = { storage: 'local', key, url, size: buffer.length, mimeType: opts?.contentType || 'application/octet-stream' };
    
    // Track storage usage if tenantId is provided
    if (opts?.tenantId) {
      await this.usageTracking.trackStorageUsage({
        tenantId: opts.tenantId,
        resourceType: opts.resourceType || 'file_upload',
        fileName: opts.filename,
        fileSize: buffer.length,
        storageType: 'local',
        key,
        mimeType: opts.contentType || 'application/octet-stream',
        metadata: { folder, uploadPath: uploadRoot },
      });
    }
    
    return result;
  }

  /**
   * Generate image variants using sharp if available. Falls back to no-op if sharp is not installed.
   */
  async generateImageVariants(file: Express.Multer.File, kind: 'logo' | 'favicon' | 'email_header' | 'mobile_icon' | string) {
    let sharp: any;
    try {
      // Dynamic import so build works even if sharp isn't installed locally
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sharp = (await import('sharp')).default;
    } catch (_e) {
      this.logger.warn(`sharp not available; skipping variant generation for kind=${kind}`);
      return [] as Array<{ size: string; format: string; url: string; fileSize: number }>;
    }

    const variantsPlan: Array<{ width?: number; height?: number; size: string; format: 'png' | 'webp' }> = [];
    const push = (v: { width?: number; height?: number; size: string; format: 'png' | 'webp' }) => variantsPlan.push(v);

    switch (kind) {
      case 'logo':
        push({ width: 256, size: '256w', format: 'png' });
        push({ width: 512, size: '512w', format: 'png' });
        push({ width: 1024, size: '1024w', format: 'webp' });
        break;
      case 'favicon':
        push({ width: 16, size: '16x16', format: 'png' });
        push({ width: 32, size: '32x32', format: 'png' });
        push({ width: 48, size: '48x48', format: 'png' });
        break;
      case 'email_header':
        push({ width: 1200, size: '1200w', format: 'png' });
        push({ width: 1200, size: '1200w', format: 'webp' });
        break;
      case 'mobile_icon':
        push({ width: 180, size: '180x180', format: 'png' });
        push({ width: 192, size: '192x192', format: 'png' });
        push({ width: 512, size: '512x512', format: 'png' });
        break;
      default:
        push({ width: 512, size: '512w', format: 'png' });
        break;
    }

    const results: Array<{ size: string; format: string; url: string; fileSize: number }> = [];
    for (const plan of variantsPlan) {
      const image = sharp(file.buffer);
      if (plan.width || plan.height) {
        image.resize({ width: plan.width, height: plan.height, fit: 'inside' });
      }
      const output = await image.toFormat(plan.format).toBuffer();
      const saved = await this.saveBuffer(output, {
        folder: 'brand-assets/variants',
        filename: `${plan.size}.${plan.format}`,
        contentType: plan.format === 'png' ? 'image/png' : 'image/webp',
      });
      results.push({ size: plan.size, format: plan.format, url: saved.url, fileSize: saved.size });
    }
    return results;
  }

  async getFile(_id: string) {
    return { message: 'Use returned URL from upload to access files directly.' };
  }

  private buildPublicS3Url(bucket: string, key: string) {
    const cdn = this.config.get<string>('S3_CDN_URL');
    if (cdn) return `${cdn}/${key}`;
    const region = this.config.get<string>('S3_REGION') || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private async buildSignedUrl(bucket: string, key: string, ttlSeconds: number) {
    const cdn = this.config.get<string>('S3_CDN_URL');
    if (cdn) return `${cdn}/${key}`;
    if (!this.s3) return this.buildPublicS3Url(bucket, key);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    try {
      const signed = await getSignedUrl(this.s3, command, { expiresIn: ttlSeconds });
      return signed;
    } catch {
      return this.buildPublicS3Url(bucket, key);
    }
  }
}
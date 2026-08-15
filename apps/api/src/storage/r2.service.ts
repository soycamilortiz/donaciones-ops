import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { normalizeR2Endpoint } from './r2.util';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client | null;
  readonly bucket: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.bucket = this.config.get('R2_BUCKET', { infer: true });
    const accessKeyId = this.config.get('R2_ACCESS_KEY_ID', { infer: true });
    const secretAccessKey = this.config.get('R2_SECRET_ACCESS_KEY', { infer: true });
    const rawEndpoint = this.config.get('R2_ENDPOINT', { infer: true });

    if (!accessKeyId || !secretAccessKey || !rawEndpoint) {
      this.client = null;
      this.logger.warn('R2 no configurado: faltan ACCESS_KEY, SECRET o ENDPOINT');
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: normalizeR2Endpoint(rawEndpoint, this.bucket),
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  missingConfig(): string[] {
    const missing: string[] = [];
    if (!this.config.get('R2_ACCESS_KEY_ID', { infer: true })) {
      missing.push('R2_ACCESS_KEY_ID');
    }
    if (!this.config.get('R2_SECRET_ACCESS_KEY', { infer: true })) {
      missing.push('R2_SECRET_ACCESS_KEY');
    }
    if (!this.config.get('R2_ENDPOINT', { infer: true })) {
      missing.push('R2_ENDPOINT');
    }
    return missing;
  }

  async ping(): Promise<{ bucket: string }> {
    if (!this.client) {
      throw new Error(`R2 no configurado (${this.missingConfig().join(', ')})`);
    }
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    return { bucket: this.bucket };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { t } from '../i18n/t';

@Injectable()
export class StorageService {
  private s3: S3Client | null = null;

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
  ) {
    if (this.driver() === 's3') {
      this.s3 = new S3Client({
        region: this.config.get('S3_REGION') || 'auto',
        endpoint: this.config.get('S3_ENDPOINT') || undefined,
        forcePathStyle: this.config.get('S3_FORCE_PATH_STYLE') !== 'false',
        credentials: {
          accessKeyId: this.config.get('S3_ACCESS_KEY_ID') || '',
          secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY') || '',
        },
      });
    }
  }

  driver(): 's3' | 'local' {
    const bucket = this.config.get<string>('S3_BUCKET');
    return this.config.get('STORAGE_DRIVER') === 's3' && bucket ? 's3' : 'local';
  }

  private publicApi() {
    return this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:3001';
  }

  private uploadDir() {
    return this.config.get<string>('UPLOAD_DIR') || './uploads';
  }

  private localPath(storageKey: string) {
    return join(this.uploadDir(), storageKey);
  }

  async presignUpload(storageKey: string, mimeType: string) {
    if (this.driver() === 's3' && this.s3) {
      const command = new PutObjectCommand({
        Bucket: this.config.get('S3_BUCKET'),
        Key: storageKey,
        ContentType: mimeType,
      });
      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
      return { storageKey, uploadUrl };
    }

    const token = this.jwt.sign({ purpose: 'upload', storageKey }, { expiresIn: '15m' });
    return {
      storageKey,
      uploadUrl: `${this.publicApi()}/storage/upload?token=${encodeURIComponent(token)}`,
    };
  }

  async signDownload(storageKey: string, filename: string) {
    if (this.driver() === 's3' && this.s3) {
      const command = new GetObjectCommand({
        Bucket: this.config.get('S3_BUCKET'),
        Key: storageKey,
        ResponseContentDisposition: `inline; filename="${filename.replace(/"/g, '')}"`,
        ResponseContentType: 'application/pdf',
      });
      return getSignedUrl(this.s3, command, { expiresIn: 900 });
    }

    const token = this.jwt.sign({ purpose: 'download', storageKey, filename }, { expiresIn: '15m' });
    return `${this.publicApi()}/storage/download?token=${encodeURIComponent(token)}`;
  }

  async put(storageKey: string, body: Buffer, mimeType = 'application/pdf') {
    if (this.driver() === 's3' && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.get('S3_BUCKET'),
          Key: storageKey,
          Body: body,
          ContentType: mimeType,
        }),
      );
      return;
    }
    await this.saveLocal(storageKey, body);
  }

  async saveLocal(storageKey: string, body: Buffer) {
    const filePath = this.localPath(storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }

  openLocal(storageKey: string) {
    const filePath = this.localPath(storageKey);
    if (!existsSync(filePath)) return null;
    return createReadStream(filePath);
  }

  existsLocal(storageKey: string) {
    return existsSync(this.localPath(storageKey));
  }

  async getBuffer(storageKey: string): Promise<Buffer | null> {
    if (this.driver() === 's3' && this.s3) {
      try {
        const res = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.config.get('S3_BUCKET'),
            Key: storageKey,
          }),
        );
        if (!res.Body) return null;
        return Buffer.from(await res.Body.transformToByteArray());
      } catch (err) {
        if (isMissingObject(err)) return null;
        throw err;
      }
    }
    const filePath = this.localPath(storageKey);
    if (!existsSync(filePath)) return null;
    return readFile(filePath);
  }

  async exists(storageKey: string) {
    if (this.driver() === 's3' && this.s3) {
      try {
        await this.s3.send(
          new HeadObjectCommand({
            Bucket: this.config.get('S3_BUCKET'),
            Key: storageKey,
          }),
        );
        return true;
      } catch (err) {
        if (isMissingObject(err)) return false;
        throw err;
      }
    }
    return this.existsLocal(storageKey);
  }

  verifyUploadToken(token: string) {
    const payload = this.jwt.verify<{ purpose: string; storageKey: string }>(token);
    if (payload.purpose !== 'upload' || !payload.storageKey) {
      throw new Error(t('invalidUploadToken'));
    }
    return payload.storageKey;
  }

  verifyDownloadToken(token: string) {
    const payload = this.jwt.verify<{ purpose: string; storageKey: string; filename?: string }>(token);
    if (payload.purpose !== 'download' || !payload.storageKey) {
      throw new Error(t('invalidDownloadToken'));
    }
    return payload;
  }

  async deleteObject(storageKey: string) {
    try {
      if (this.driver() === 's3' && this.s3) {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.config.get('S3_BUCKET'),
            Key: storageKey,
          }),
        );
        return;
      }
      const filePath = this.localPath(storageKey);
      if (existsSync(filePath)) await unlink(filePath);
    } catch {
      // blob cleanup is best-effort
    }
  }
}

function isMissingObject(err: unknown) {
  const error = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    error.name === 'NotFound' ||
    error.name === 'NoSuchKey' ||
    error.Code === 'NoSuchKey' ||
    error.$metadata?.httpStatusCode === 404
  );
}

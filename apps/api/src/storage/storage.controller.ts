import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StorageService } from './storage.service';
import { t } from '../i18n/t';

@Controller('storage')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Put('upload')
  async upload(@Query('token') token: string, @Req() req: Request, @Res() res: Response) {
    if (!token) throw new UnauthorizedException(t('uploadTokenRequired'));
    let storageKey: string;
    try {
      storageKey = this.storage.verifyUploadToken(token);
    } catch {
      throw new UnauthorizedException(t('uploadTokenInvalid'));
    }
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException(t('emptyUpload'));
    }
    if (body.length > 50 * 1024 * 1024) {
      throw new BadRequestException(t('fileTooLarge'));
    }
    await this.storage.saveLocal(storageKey, body);
    res.status(200).json({ ok: true, storageKey });
  }

  @Get('download')
  async download(@Query('token') token: string, @Res() res: Response) {
    if (!token) throw new UnauthorizedException(t('downloadTokenRequired'));
    let payload: { storageKey: string; filename?: string };
    try {
      payload = this.storage.verifyDownloadToken(token);
    } catch {
      throw new UnauthorizedException(t('downloadTokenInvalid'));
    }
    const stream = this.storage.openLocal(payload.storageKey);
    if (!stream) throw new NotFoundException(t('blobMissing'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(payload.filename || 'document.pdf').replace(/"/g, '')}"`,
    );
    stream.pipe(res);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalysisKind, AnalysisStatus, ResourceType } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { t } from '../i18n/t';
import { AiSettingsService } from './ai-settings.service';
import { MISSING_AI_KEY_ERROR } from './errors';

@Injectable()
export class AnalysisService {
  constructor(
    private prisma: PrismaService,
    private settings: AiSettingsService,
    private access: AccessService,
  ) {}

  async enqueueFromDto(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    kind: AnalysisKind,
  ) {
    if (resourceType === 'FILE' && kind !== 'FILE_SUMMARY') {
      throw new BadRequestException(t('aiKindMismatch'));
    }
    if (resourceType === 'FOLDER' && kind === 'FILE_SUMMARY') {
      throw new BadRequestException(t('aiKindMismatch'));
    }
    const dataRoomId =
      resourceType === 'FILE'
        ? (await this.access.getFileOrThrow(resourceId)).dataRoomId
        : (await this.access.getFolderOrThrow(resourceId)).dataRoomId;
    await this.access.assertCanEdit(userId, dataRoomId);
    if (resourceType === 'FOLDER' && kind === 'FOLDER_SUMMARY') {
      const summary = await this.enqueue({ userId, dataRoomId, resourceType, resourceId, kind: 'FOLDER_SUMMARY' });
      const compare = await this.enqueue({ userId, dataRoomId, resourceType, resourceId, kind: 'FOLDER_COMPARE' });
      return [summary, compare];
    }
    return [await this.enqueue({ userId, dataRoomId, resourceType, resourceId, kind })];
  }

  async listForViewer(userId: string, resourceType: ResourceType, resourceId: string) {
    const dataRoomId =
      resourceType === 'FILE'
        ? (await this.access.getFileOrThrow(resourceId)).dataRoomId
        : (await this.access.getFolderOrThrow(resourceId)).dataRoomId;
    await this.access.assertCanView({ userId, dataRoomId, fileId: resourceType === 'FILE' ? resourceId : undefined, folderId: resourceType === 'FOLDER' ? resourceId : undefined });
    return this.getForResource(resourceType, resourceId);
  }

  async enqueue(params: {
    userId: string;
    dataRoomId: string;
    resourceType: ResourceType;
    resourceId: string;
    kind: AnalysisKind;
  }) {
    const settings = await this.settings.get(params.userId);
    const row = await this.prisma.analysis.upsert({
      where: {
        resourceType_resourceId_kind: {
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          kind: params.kind,
        },
      },
      create: {
        dataRoomId: params.dataRoomId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        kind: params.kind,
        status: 'QUEUED',
        locale: settings.locale,
        requestedBy: params.userId,
      },
      update: {
        status: 'QUEUED',
        error: null,
        locale: settings.locale,
        requestedBy: params.userId,
      },
    });
    return this.serialize(row);
  }

  async getForResource(resourceType: ResourceType, resourceId: string) {
    const rows = await this.prisma.analysis.findMany({
      where: { resourceType, resourceId },
    });
    return rows.map((row) => this.serialize(row));
  }

  async decorateListing<
    T extends { folders: { id: string }[]; files: { id: string }[]; folder?: { id: string } | null },
  >(listing: T) {
    const folderIds = listing.folders.map((f) => f.id);
    if (listing.folder?.id) folderIds.push(listing.folder.id);
    const [folderMap, fileMap] = await Promise.all([
      this.statusesFor('FOLDER', folderIds),
      this.statusesFor('FILE', listing.files.map((f) => f.id)),
    ]);
    return {
      ...listing,
      folder: listing.folder
        ? {
            ...listing.folder,
            analysisStatus: (folderMap.get(listing.folder.id) as 'no' | 'in_process' | 'done' | 'failed') ?? 'no',
          }
        : listing.folder,
      folders: listing.folders.map((folder) => ({
        ...folder,
        analysisStatus: (folderMap.get(folder.id) as 'no' | 'in_process' | 'done' | 'failed') ?? 'no',
      })),
      files: listing.files.map((file) => ({
        ...file,
        analysisStatus: (fileMap.get(file.id) as 'no' | 'in_process' | 'done' | 'failed') ?? 'no',
      })),
    };
  }

  async notifyFileChanged(userId: string, file: { id: string; folderId: string | null; dataRoomId: string }) {
    await this.enqueue({
      userId,
      dataRoomId: file.dataRoomId,
      resourceType: 'FILE',
      resourceId: file.id,
      kind: 'FILE_SUMMARY',
    });
    if (file.folderId) {
      await this.enqueue({
        userId,
        dataRoomId: file.dataRoomId,
        resourceType: 'FOLDER',
        resourceId: file.folderId,
        kind: 'FOLDER_SUMMARY',
      });
      await this.enqueue({
        userId,
        dataRoomId: file.dataRoomId,
        resourceType: 'FOLDER',
        resourceId: file.folderId,
        kind: 'FOLDER_COMPARE',
      });
    }
  }

  async notifyFolderChanged(userId: string, folder: { id: string; parentId: string | null; dataRoomId: string }) {
    await this.enqueue({
      userId,
      dataRoomId: folder.dataRoomId,
      resourceType: 'FOLDER',
      resourceId: folder.id,
      kind: 'FOLDER_SUMMARY',
    });
    await this.enqueue({
      userId,
      dataRoomId: folder.dataRoomId,
      resourceType: 'FOLDER',
      resourceId: folder.id,
      kind: 'FOLDER_COMPARE',
    });
    if (folder.parentId) {
      await this.enqueue({
        userId,
        dataRoomId: folder.dataRoomId,
        resourceType: 'FOLDER',
        resourceId: folder.parentId,
        kind: 'FOLDER_SUMMARY',
      });
      await this.enqueue({
        userId,
        dataRoomId: folder.dataRoomId,
        resourceType: 'FOLDER',
        resourceId: folder.parentId,
        kind: 'FOLDER_COMPARE',
      });
    }
  }

  async notifyFolderContentsChanged(userId: string, folderId: string | null, dataRoomId: string) {
    if (!folderId) return;
    await this.enqueue({
      userId,
      dataRoomId,
      resourceType: 'FOLDER',
      resourceId: folderId,
      kind: 'FOLDER_SUMMARY',
    });
    await this.enqueue({
      userId,
      dataRoomId,
      resourceType: 'FOLDER',
      resourceId: folderId,
      kind: 'FOLDER_COMPARE',
    });
  }

  async resumeWhenKeyReady(userId: string, opts?: { allFailed?: boolean }) {
    const settings = await this.settings.get(userId);
    if (!settings.hasKey) return 0;
    const result = await this.prisma.analysis.updateMany({
      where: {
        requestedBy: userId,
        status: 'FAILED',
        ...(opts?.allFailed ? {} : { error: MISSING_AI_KEY_ERROR }),
      },
      data: { status: 'QUEUED', error: null, locale: settings.locale },
    });
    return result.count;
  }

  async statusesFor(resourceType: ResourceType, ids: string[]) {
    if (ids.length === 0) return new Map<string, string>();
    const rows = await this.prisma.analysis.findMany({
      where: { resourceType, resourceId: { in: ids } },
      select: { resourceId: true, status: true, kind: true },
    });
    const map = new Map<string, string>();
    for (const row of rows) {
      const current = map.get(row.resourceId);
      map.set(row.resourceId, pickStatus(current, row.status));
    }
    return map;
  }

  serialize(row: {
    id: string;
    resourceType: ResourceType;
    resourceId: string;
    kind: AnalysisKind;
    status: AnalysisStatus;
    html: string | null;
    error: string | null;
    locale: string;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      kind: row.kind,
      status: publicStatus(row.status),
      html: row.html,
      error: row.error,
      locale: row.locale,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function publicStatus(status: AnalysisStatus): 'no' | 'in_process' | 'done' | 'failed' {
  if (status === 'DONE') return 'done';
  if (status === 'FAILED') return 'failed';
  return 'in_process';
}

function pickStatus(current: string | undefined, next: AnalysisStatus) {
  const mapped = publicStatus(next);
  if (!current) return mapped;
  if (current === 'in_process' || mapped === 'in_process') return 'in_process';
  if (mapped === 'failed') return 'failed';
  return current === 'failed' ? current : mapped;
}

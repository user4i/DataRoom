import { Injectable } from '@nestjs/common';
import { AnalysisKind, AnalysisStatus, ResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiSettingsService } from './ai-settings.service';

@Injectable()
export class AnalysisService {
  constructor(
    private prisma: PrismaService,
    private settings: AiSettingsService,
  ) {}

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

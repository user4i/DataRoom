import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AnalysisKind, ResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiSettingsService } from './ai-settings.service';
import { LlmService } from './llm.service';
import { payloadToHtml } from './html';
import { parseAiPayload } from './payload';
import { extractPdfText, hashBuffer } from './pdf-text';
import { fileSummaryPrompt, folderComparePrompt, folderSummaryPrompt } from './prompt';

const TICK_MS = 2000;
const STALE_MS = 5 * 60 * 1000;

@Injectable()
export class AnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AnalysisWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private busy = false;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private settings: AiSettingsService,
    private llm: LlmService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.tick().catch((err) => this.log.warn(err instanceof Error ? err.message : err));
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.requeueStale();
      const job = await this.nextRunnableJob();
      if (!job) return;
      await this.prisma.analysis.update({
        where: { id: job.id },
        data: { status: 'RUNNING', error: null },
      });
      try {
        await this.process(job.id, job.kind, job.resourceType, job.resourceId, job.requestedBy);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        await this.prisma.analysis.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: message.slice(0, 800) },
        });
      }
    } finally {
      this.busy = false;
    }
  }

  private async nextRunnableJob() {
    const candidates = await this.prisma.analysis.findMany({
      where: {
        OR: [{ status: 'QUEUED' }, { status: 'FAILED', error: { contains: 'API key' } }],
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    for (const job of candidates) {
      if (await this.settings.decryptedKey(job.requestedBy)) return job;
    }
    return null;
  }

  private async requeueStale() {
    const cutoff = new Date(Date.now() - STALE_MS);
    await this.prisma.analysis.updateMany({
      where: { status: 'RUNNING', updatedAt: { lt: cutoff } },
      data: { status: 'QUEUED' },
    });
  }

  private async process(
    id: string,
    kind: AnalysisKind,
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
  ) {
    const settings = await this.settings.get(userId);
    const apiKey = await this.settings.decryptedKey(userId);
    if (!apiKey) throw new Error('Add an AI API key in Settings');
    const locale = settings.locale === 'en' ? 'en' : 'uk';

    if (kind === 'FILE_SUMMARY' && resourceType === 'FILE') {
      const file = await this.prisma.file.findUnique({ where: { id: resourceId } });
      if (!file) throw new Error('File not found');
      const buffer = await this.storage.getBuffer(file.storageKey);
      if (!buffer) throw new Error('The file is missing from storage');
      const text = await extractPdfText(buffer);
      const raw = await this.llm.complete({
        provider: settings.provider,
        apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        prompt: fileSummaryPrompt(locale, file.name, text || '(empty PDF text)'),
      });
      const payload = parseAiPayload(raw);
      await this.prisma.analysis.update({
        where: { id },
        data: {
          status: 'DONE',
          html: payloadToHtml(payload),
          payloadJson: payload as object,
          contentHash: hashBuffer(buffer),
          error: null,
        },
      });
      return;
    }

    if ((kind === 'FOLDER_SUMMARY' || kind === 'FOLDER_COMPARE') && resourceType === 'FOLDER') {
      const corpus = await this.folderCorpus(resourceId);
      const prompt =
        kind === 'FOLDER_SUMMARY'
          ? folderSummaryPrompt(locale, corpus.folderName, corpus.text)
          : folderComparePrompt(locale, corpus.folderName, corpus.text);
      const raw = await this.llm.complete({
        provider: settings.provider,
        apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        prompt,
      });
      const payload = parseAiPayload(raw);
      await this.prisma.analysis.update({
        where: { id },
        data: {
          status: 'DONE',
          html: payloadToHtml(payload),
          payloadJson: payload as object,
          contentHash: corpus.hash,
          error: null,
        },
      });
      return;
    }

    throw new Error('Unsupported analysis kind');
  }

  private async folderCorpus(folderId: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new Error('Folder not found');
    const files = await this.prisma.file.findMany({ where: { folderId } });
    const children = await this.prisma.folder.findMany({ where: { parentId: folderId } });
    const childFiles = await this.prisma.file.findMany({
      where: { folderId: { in: children.map((c) => c.id) } },
    });
    const chunks: string[] = [`Folder: ${folder.name}`];
    const hashParts: string[] = [];
    for (const file of [...files, ...childFiles]) {
      const buffer = await this.storage.getBuffer(file.storageKey);
      const text = buffer ? await extractPdfText(buffer) : '(missing blob)';
      const where = file.folderId === folderId ? 'in folder' : 'in subfolder';
      chunks.push(`--- FILE ${file.name} (${where}) ---\n${text.slice(0, 8000)}`);
      hashParts.push(file.id, file.updatedAt.toISOString(), String(file.size));
    }
    for (const child of children) {
      chunks.push(`--- SUBFOLDER ${child.name} (${child.itemCount} items) ---`);
      hashParts.push(child.id, child.updatedAt.toISOString());
    }
    return { folderName: folder.name, text: chunks.join('\n\n'), hash: hashParts.join('|') };
  }
}

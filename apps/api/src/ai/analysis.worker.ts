import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AnalysisKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { extractPdfText, hashBuffer, escapeHtml } from './pdf-text';

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
      const job = await this.prisma.analysis.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { updatedAt: 'asc' },
      });
      if (!job) return;
      await this.prisma.analysis.update({
        where: { id: job.id },
        data: { status: 'RUNNING', error: null },
      });
      try {
        await this.process(job.id, job.kind, job.resourceType, job.resourceId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        await this.prisma.analysis.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: message.slice(0, 500) },
        });
      }
    } finally {
      this.busy = false;
    }
  }

  private async requeueStale() {
    const cutoff = new Date(Date.now() - STALE_MS);
    await this.prisma.analysis.updateMany({
      where: { status: 'RUNNING', updatedAt: { lt: cutoff } },
      data: { status: 'QUEUED' },
    });
  }

  private async process(id: string, kind: AnalysisKind, resourceType: string, resourceId: string) {
    if (kind === 'FILE_SUMMARY' && resourceType === 'FILE') {
      const file = await this.prisma.file.findUnique({ where: { id: resourceId } });
      if (!file) throw new Error('File not found');
      const buffer = await this.storage.getBuffer(file.storageKey);
      if (!buffer) throw new Error('The file is missing from storage');
      const text = await extractPdfText(buffer);
      const contentHash = hashBuffer(buffer);
      const html = `<pre class="ai-extract">${escapeHtml(text.slice(0, 20000))}</pre>`;
      await this.prisma.analysis.update({
        where: { id },
        data: {
          status: 'DONE',
          html,
          payloadJson: { extractedChars: text.length, text: text.slice(0, 50000) },
          contentHash,
          error: null,
        },
      });
      return;
    }
    await this.prisma.analysis.update({
      where: { id },
      data: { status: 'FAILED', error: 'This analysis kind is not implemented yet' },
    });
  }
}

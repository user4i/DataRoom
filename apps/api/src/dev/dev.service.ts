import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SeedScale } from './dto/seed.dto';

const PDF = 'application/pdf';
const PROPOSAL_FIXTURES = join(__dirname, '..', '..', 'fixtures', 'proposals');

type FolderSpec = { name: string; children?: FolderSpec[]; files: string[] };

const MINIMAL: { rootFiles: string[]; folders: FolderSpec[] } = {
  rootFiles: ['Green-Valley-offer-2026-04-12.pdf', 'AgroSmak-proposal-88-03.pdf'],
  folders: [
    { name: 'Scans', files: ['Green-Valley-offer-SCAN-2026-01-20.pdf'] },
    { name: 'Intermediaries', files: ['Baltic-Trade-Hub-agent-offer.pdf'] },
  ],
};

const MEDIUM: { rootFiles: string[]; folders: FolderSpec[] } = {
  rootFiles: ['Green-Valley-offer-2026-04-12.pdf', 'Delta-Fresh-quote-Q-441.pdf'],
  folders: [
    {
      name: 'Direct suppliers',
      files: ['Noord-Groente-pricelist-W12.pdf', 'Iberia-Citrus-weekly-2026-03-09.pdf', 'Horizon-Coop-week16.pdf'],
    },
    { name: 'Ukraine', files: ['AgroSmak-proposal-88-03.pdf', 'FG-Sadok-SCAN.pdf'] },
    { name: 'Intermediaries', files: ['Baltic-Trade-Hub-agent-offer.pdf', 'Logistic-Plus-agent.pdf'] },
    {
      name: 'Questionable',
      files: ['EuroBest-Produce-special.pdf', 'CashLot-no-VAT-SCAN.pdf', 'Shid-Produkt-overcharge.pdf'],
    },
  ],
};

function heavySpec(): { rootFiles: string[]; folders: FolderSpec[] } {
  return {
    rootFiles: [
      'Green-Valley-offer-2026-04-12.pdf',
      'Delta-Fresh-quote-Q-441.pdf',
      'AgroSmak-proposal-88-03.pdf',
    ],
    folders: [
      {
        name: 'Direct suppliers',
        files: ['Horizon-Coop-week16.pdf'],
        children: [
          { name: 'Netherlands', files: ['Noord-Groente-pricelist-W12.pdf', 'Delta-warehouse-note-SCAN.pdf'] },
          { name: 'Spain', files: ['Iberia-Citrus-weekly-2026-03-09.pdf', 'Iberia-copy-stamp-SCAN.pdf'] },
          { name: 'United Kingdom', files: ['Kent-Orchards-fax-SCAN.pdf', 'Green-Valley-offer-SCAN-2026-01-20.pdf'] },
        ],
      },
      { name: 'Ukraine', files: ['FG-Sadok-SCAN.pdf', 'Shid-Produkt-overcharge.pdf'] },
      {
        name: 'Intermediaries',
        files: ['Baltic-Trade-Hub-agent-offer.pdf', 'Logistic-Plus-agent.pdf'],
        children: [
          {
            name: 'Disputed',
            files: [
              'EuroBest-Produce-special.pdf',
              'AgroLink-resale-SCAN.pdf',
              'Mediator-markup-SCAN.pdf',
              'Twin-count-offer-SCAN.pdf',
              'CashLot-no-VAT-SCAN.pdf',
              'Broker-Odesa-SCAN.pdf',
            ],
          },
        ],
      },
    ],
  };
}

@Injectable()
export class DevService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private storage: StorageService,
  ) {}

  async seed(userId: string, dataRoomId: string, scale: SeedScale) {
    await this.access.assertCanEdit(userId, dataRoomId);

    await this.clearRoom(dataRoomId);
    if (scale === 'clear') {
      return { scale, folders: 0, files: 0 };
    }

    const spec = scale === 'minimal' ? MINIMAL : scale === 'medium' ? MEDIUM : heavySpec();
    let folderCount = 0;
    let fileCount = 0;

    await Promise.all(spec.rootFiles.map((name) => this.addFile(dataRoomId, null, name)));
    fileCount += spec.rootFiles.length;

    const walk = async (folder: FolderSpec, parentId: string | null) => {
      const created = await this.addFolder(dataRoomId, parentId, folder.name);
      folderCount += 1;
      await Promise.all(folder.files.map((name) => this.addFile(dataRoomId, created.id, name)));
      fileCount += folder.files.length;
      for (const child of folder.children ?? []) {
        await walk(child, created.id);
      }
    };

    for (const folder of spec.folders) {
      await walk(folder, null);
    }

    await this.recomputeFolderStats(dataRoomId);
    return { scale, folders: folderCount, files: fileCount };
  }

  private async clearRoom(dataRoomId: string) {
    const files = await this.prisma.file.findMany({
      where: { dataRoomId },
      include: { versions: { select: { storageKey: true } } },
    });
    await Promise.all(
      files.flatMap((file) => [
        this.storage.deleteObject(file.storageKey),
        ...file.versions.map((v) => this.storage.deleteObject(v.storageKey)),
      ]),
    );
    await this.prisma.file.deleteMany({ where: { dataRoomId } });
    await this.prisma.folder.deleteMany({ where: { dataRoomId, parentId: null } });
  }

  private async addFolder(dataRoomId: string, parentId: string | null, name: string) {
    const created = await this.prisma.folder.create({
      data: { dataRoomId, parentId, name, path: '/pending/' },
    });
    const parent = parentId ? await this.prisma.folder.findUnique({ where: { id: parentId } }) : null;
    const path = parent ? `${parent.path}${created.id}/` : `/${created.id}/`;
    return this.prisma.folder.update({ where: { id: created.id }, data: { path } });
  }

  private async addFile(dataRoomId: string, folderId: string | null, name: string) {
    let body: Buffer;
    try {
      body = await readFile(join(PROPOSAL_FIXTURES, name));
    } catch {
      throw new InternalServerErrorException(`Missing proposal fixture: ${name}`);
    }
    const storageKey = `rooms/${dataRoomId}/${randomUUID()}.pdf`;
    await this.storage.put(storageKey, body);
    await this.prisma.file.create({
      data: {
        dataRoomId,
        folderId,
        name,
        storageKey,
        size: BigInt(body.length),
        mimeType: PDF,
      },
    });
  }

  private async recomputeFolderStats(dataRoomId: string) {
    const folders = await this.prisma.folder.findMany({ where: { dataRoomId } });
    const files = await this.prisma.file.findMany({
      where: { dataRoomId },
      select: { folderId: true, size: true },
    });
    await Promise.all(
      folders.map((folder) => {
        const descendantIds = new Set(
          folders.filter((f) => f.path.startsWith(folder.path)).map((f) => f.id),
        );
        const nestedFiles = files.filter((f) => f.folderId && descendantIds.has(f.folderId));
        return this.prisma.folder.update({
          where: { id: folder.id },
          data: {
            itemCount: descendantIds.size - 1 + nestedFiles.length,
            totalSize: nestedFiles.reduce((sum, f) => sum + f.size, 0n),
          },
        });
      }),
    );
  }
}

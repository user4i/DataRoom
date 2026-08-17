import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SeedScale } from './dto/seed.dto';

const PDF = 'application/pdf';

type FolderSpec = { name: string; children?: FolderSpec[]; files: string[] };

const MINIMAL: { rootFiles: string[]; folders: FolderSpec[] } = {
  rootFiles: ['Welcome.pdf', 'Room overview.pdf'],
  folders: [
    { name: 'Legal', files: ['NDA.pdf'] },
    { name: 'Finance', files: [] },
  ],
};

const MEDIUM: { rootFiles: string[]; folders: FolderSpec[] } = {
  rootFiles: ['Welcome.pdf', 'Index.pdf', 'Process memo.pdf', 'FAQ.pdf'],
  folders: [
    {
      name: 'Legal',
      files: ['NDA.pdf', 'Articles.pdf'],
      children: [{ name: 'Contracts', files: ['MSA.pdf', 'SOW.pdf'] }],
    },
    {
      name: 'Finance',
      files: ['Budget.pdf', 'Cap table.pdf'],
      children: [{ name: 'Reports', files: ['Q1.pdf', 'Q2.pdf'] }],
    },
    { name: 'HR', files: ['Org chart.pdf', 'Handbook.pdf'] },
    { name: 'Technical', files: ['Architecture.pdf'] },
  ],
};

function heavySpec(): { rootFiles: string[]; folders: FolderSpec[] } {
  const departments = ['Legal', 'Finance', 'HR', 'Technical', 'Commercial', 'Operations'];
  const subfolders = ['Contracts', 'Reports', 'Archive'];
  return {
    rootFiles: Array.from({ length: 12 }, (_, i) => `Root memo ${String(i + 1).padStart(2, '0')}.pdf`),
    folders: departments.map((name) => ({
      name,
      files: [`${name} overview.pdf`, `${name} checklist.pdf`],
      children: subfolders.map((child) => ({
        name: child,
        files: Array.from({ length: 4 }, (_, i) => `${name} ${child} ${i + 1}.pdf`),
      })),
    })),
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
    const body = buildPdf(name);
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

function buildPdf(title: string): Buffer {
  const escaped = title.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = `BT /F1 16 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${Buffer.byteLength(content)} >>stream\n${content}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body));
    body += obj;
  }
  const xrefPos = Buffer.byteLength(body);
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${xref}trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  const pad = Buffer.byteLength(title) * 17 + 120;
  return Buffer.concat([Buffer.from(body), Buffer.from(`\n% ${'x'.repeat(pad)}`)]);
}

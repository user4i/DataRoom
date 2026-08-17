import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { rethrowUnique } from '../common/prisma-errors';
import { ancestorIdsFromPath, serializeFile } from '../common/serialize';
import { ConfirmFileDto, MoveFileDto, PresignDto } from './dto/file.dto';
import { AnalysisService } from '../ai/analysis.service';
import { t } from '../i18n/t';

const PDF = 'application/pdf';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private storage: StorageService,
    private analysis: AnalysisService,
  ) {}

  private assertPdf(mimeType: string, name: string) {
    const mime = mimeType.toLowerCase();
    const lower = name.toLowerCase();
    if (mime !== PDF && mime !== 'application/x-pdf') {
      throw new BadRequestException(t('pdfOnly'));
    }
    if (!lower.endsWith('.pdf')) {
      throw new BadRequestException(t('nameMustPdf'));
    }
  }

  async uniqueName(
    dataRoomId: string,
    folderId: string | null,
    originalName: string,
    excludeId?: string,
    extraTaken: string[] = [],
  ) {
    const existing = await this.prisma.file.findMany({
      where: {
        dataRoomId,
        folderId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { name: true },
    });
    const names = new Set([
      ...existing.map((f) => f.name.toLowerCase()),
      ...extraTaken.map((n) => n.toLowerCase()),
    ]);
    if (!names.has(originalName.toLowerCase())) return originalName;
    const dot = originalName.lastIndexOf('.');
    const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
    const ext = dot > 0 ? originalName.slice(dot) : '';
    let i = 1;
    while (names.has(`${stem} (${i})${ext}`.toLowerCase())) i += 1;
    return `${stem} (${i})${ext}`;
  }

  async nameConflict(
    userId: string,
    dataRoomId: string,
    folderId: string | null,
    name: string,
    excludeId?: string,
  ) {
    await this.access.assertCanEdit(userId, dataRoomId);
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException(t('fileNameRequired'));
    const existing = await this.prisma.file.findFirst({
      where: {
        dataRoomId,
        folderId,
        name: { equals: trimmed, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    const suggestedNewName = await this.uniqueName(dataRoomId, folderId, trimmed, excludeId);
    const suggestedOldName = await this.uniqueName(dataRoomId, folderId, trimmed, excludeId, [
      suggestedNewName,
    ]);
    return {
      existing: existing ? serializeFile(existing) : null,
      suggestedNewName,
      suggestedOldName,
    };
  }

  async presign(userId: string, dto: PresignDto) {
    this.assertPdf(dto.mimeType, dto.name);
    await this.access.assertCanEdit(userId, dto.dataRoomId);
    if (dto.folderId) {
      const folder = await this.access.getFolderOrThrow(dto.folderId);
      if (folder.dataRoomId !== dto.dataRoomId) {
        throw new NotFoundException(t('folderNotFound'));
      }
    }
    const storageKey = `rooms/${dto.dataRoomId}/${randomUUID()}.pdf`;
    return this.storage.presignUpload(storageKey, PDF);
  }

  async confirm(userId: string, dto: ConfirmFileDto) {
    this.assertPdf(dto.mimeType, dto.name);
    await this.access.assertCanEdit(userId, dto.dataRoomId);
    const folderId = dto.folderId ?? null;
    if (folderId) {
      const folder = await this.access.getFolderOrThrow(folderId);
      if (folder.dataRoomId !== dto.dataRoomId) {
        throw new NotFoundException(t('folderNotFound'));
      }
    }

    if (this.storage.driver() === 'local' && !this.storage.existsLocal(dto.storageKey)) {
      throw new BadRequestException(t('uploadIncomplete'));
    }

    const name = dto.name.trim();
    const existing = await this.prisma.file.findFirst({
      where: {
        dataRoomId: dto.dataRoomId,
        folderId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      if (dto.conflict === 'replace') {
        return this.addVersion(userId, existing.id, dto.storageKey, BigInt(dto.size));
      }
      if (dto.conflict === 'keep_both') {
        return this.createFile(userId, dto.dataRoomId, folderId, await this.uniqueName(dto.dataRoomId, folderId, name), dto);
      }
      throw new ConflictException(t('fileNameTaken'));
    }
    return this.createFile(userId, dto.dataRoomId, folderId, name, dto);
  }

  private async createFile(
    userId: string,
    dataRoomId: string,
    folderId: string | null,
    name: string,
    dto: ConfirmFileDto,
  ) {
    try {
      const file = await this.prisma.$transaction(async (tx) => {
        const created = await tx.file.create({
          data: {
            dataRoomId,
            folderId,
            name,
            storageKey: dto.storageKey,
            size: BigInt(dto.size),
            mimeType: PDF,
          },
        });
        if (folderId) {
          const folder = await tx.folder.findUnique({ where: { id: folderId } });
          if (folder) {
            await tx.folder.updateMany({
              where: { id: { in: ancestorIdsFromPath(folder.path) } },
              data: {
                itemCount: { increment: 1 },
                totalSize: { increment: BigInt(dto.size) },
              },
            });
          }
        }
        return created;
      });
      await this.queueFile(userId, file);
      return serializeFile(file);
    } catch (error) {
      rethrowUnique(error, t('fileNameTaken'));
    }
  }

  async get(userId: string | null, id: string, publicToken?: string) {
    const file = await this.access.getFileOrThrow(id);
    const { access, room } = await this.access.assertCanView({
      userId,
      publicToken,
      dataRoomId: file.dataRoomId,
      fileId: file.id,
      folderId: file.folderId,
    });
    const url = (await this.storage.exists(file.storageKey))
      ? await this.storage.signDownload(file.storageKey, file.name)
      : null;
    const folder = file.folderId
      ? await this.prisma.folder.findUnique({ where: { id: file.folderId }, select: { name: true } })
      : null;
    const storedVersions = await this.prisma.fileVersion.count({ where: { fileId: file.id } });
    return {
      file: serializeFile(file, room.owner, { versionCount: storedVersions > 0 ? storedVersions : 1 }),
      access,
      dataRoomId: room.id,
      dataRoomName: room.name,
      folderName: folder?.name ?? null,
      url,
    };
  }

  async update(userId: string, id: string, dto: { name?: string; folderId?: string | null }) {
    const file = await this.access.getFileOrThrow(id);
    await this.access.assertCanEdit(userId, file.dataRoomId);

    if (dto.name && dto.folderId === undefined) {
      try {
        const updated = await this.prisma.file.update({
          where: { id },
          data: { name: dto.name.trim() },
        });
        return serializeFile(updated);
      } catch (error) {
        rethrowUnique(error, t('fileNameTaken'));
      }
    }

    if (dto.folderId !== undefined) {
      const nextFolderId = dto.folderId ?? null;
      if (nextFolderId) {
        const dest = await this.access.getFolderOrThrow(nextFolderId);
        if (dest.dataRoomId !== file.dataRoomId) {
          throw new NotFoundException(t('destFolderNotFound'));
        }
      }
      try {
        const updated = await this.prisma.$transaction(async (tx) => {
          if (file.folderId) {
            const from = await tx.folder.findUnique({ where: { id: file.folderId } });
            if (from) {
              await tx.folder.updateMany({
                where: { id: { in: ancestorIdsFromPath(from.path) } },
                data: {
                  itemCount: { decrement: 1 },
                  totalSize: { decrement: file.size },
                },
              });
            }
          }
          if (nextFolderId) {
            const to = await tx.folder.findUnique({ where: { id: nextFolderId } });
            if (to) {
              await tx.folder.updateMany({
                where: { id: { in: ancestorIdsFromPath(to.path) } },
                data: {
                  itemCount: { increment: 1 },
                  totalSize: { increment: file.size },
                },
              });
            }
          }
          return tx.file.update({
            where: { id },
            data: { folderId: nextFolderId, ...(dto.name ? { name: dto.name.trim() } : {}) },
          });
        });
        await this.queueFile(userId, updated);
        if (file.folderId && file.folderId !== updated.folderId) {
          await this.analysis.notifyFolderContentsChanged(userId, file.folderId, file.dataRoomId).catch(() => undefined);
        }
        return serializeFile(updated);
      } catch (error) {
        rethrowUnique(error, t('fileNameTakenDest'));
      }
    }

    return serializeFile(file);
  }

  async move(userId: string, id: string, dto: MoveFileDto) {
    const file = await this.access.getFileOrThrow(id);
    await this.access.assertCanEdit(userId, file.dataRoomId);
    const nextFolderId = dto.folderId ?? null;
    if (nextFolderId) {
      const dest = await this.access.getFolderOrThrow(nextFolderId);
      if (dest.dataRoomId !== file.dataRoomId) {
        throw new NotFoundException(t('destFolderNotFound'));
      }
    }

    const lostViewers = await this.viewersLostByMove(file, nextFolderId);
    if (lostViewers.publicLinkCount + lostViewers.peopleCount > 0 && !dto.confirmViewers) {
      throw new ConflictException(
        t('fileViewersConfirm'),
      );
    }

    const nextName = (dto.name ?? file.name).trim();
    const existing = await this.prisma.file.findFirst({
      where: {
        dataRoomId: file.dataRoomId,
        folderId: nextFolderId,
        name: { equals: nextName, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existing) {
      if (dto.conflict === 'replace') {
        return this.replaceOnMove(userId, file, existing);
      }
      if (dto.conflict === 'keep_both') {
        const unique = await this.uniqueName(file.dataRoomId, nextFolderId, file.name, id);
        return this.update(userId, id, { folderId: nextFolderId, name: unique });
      }
      throw new ConflictException(t('fileNameTakenDest'));
    }

    return this.update(userId, id, {
      folderId: nextFolderId,
      ...(dto.name ? { name: nextName } : {}),
    });
  }

  async moveImpact(userId: string, id: string, destFolderId: string | null) {
    const file = await this.access.getFileOrThrow(id);
    await this.access.assertCanEdit(userId, file.dataRoomId);
    if (destFolderId) {
      const dest = await this.access.getFolderOrThrow(destFolderId);
      if (dest.dataRoomId !== file.dataRoomId) {
        throw new NotFoundException(t('destFolderNotFound'));
      }
    }
    return this.viewersLostByMove(file, destFolderId);
  }

  private async viewersLostByMove(
    file: { folderId: string | null; dataRoomId: string },
    destFolderId: string | null,
  ) {
    const empty = { publicLinkCount: 0, peopleCount: 0, people: [] as string[] };
    if (!file.folderId) return empty;
    const source = await this.access.getFolderOrThrow(file.folderId);
    const dest = destFolderId ? await this.access.getFolderOrThrow(destFolderId) : null;
    const ancestorIds = ancestorIdsFromPath(source.path);
    if (ancestorIds.length === 0) return empty;
    const shares = await this.prisma.share.findMany({
      where: {
        revokedAt: null,
        resourceType: 'FOLDER',
        resourceId: { in: ancestorIds },
      },
      include: { user: { select: { email: true } } },
    });
    if (shares.length === 0) return empty;
    const roots = await this.prisma.folder.findMany({
      where: { id: { in: [...new Set(shares.map((share) => share.resourceId))] } },
      select: { id: true, path: true },
    });
    const pathById = new Map(roots.map((folder) => [folder.id, folder.path]));
    const leaving = shares.filter((share) => {
      const rootPath = pathById.get(share.resourceId);
      if (!rootPath) return false;
      return !(dest && dest.path.startsWith(rootPath));
    });
    const people = [
      ...new Set(
        leaving
          .filter((share) => share.kind === 'USER')
          .map((share) => share.user?.email || share.invitedEmail)
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    return {
      publicLinkCount: leaving.filter((share) => share.kind === 'PUBLIC_LINK').length,
      peopleCount: people.length,
      people: people.slice(0, 8),
    };
  }

  private async replaceOnMove(
    userId: string,
    source: { id: string; folderId: string | null; storageKey: string; size: bigint; dataRoomId: string },
    dest: { id: string },
  ) {
    if (source.id === dest.id) {
      return serializeFile(await this.access.getFileOrThrow(source.id));
    }
    const replaced = await this.addVersion(userId, dest.id, source.storageKey, source.size);
    const versions = await this.prisma.fileVersion.findMany({ where: { fileId: source.id } });
    await this.prisma.$transaction(async (tx) => {
      if (source.folderId) {
        const from = await tx.folder.findUnique({ where: { id: source.folderId } });
        if (from) {
          await tx.folder.updateMany({
            where: { id: { in: ancestorIdsFromPath(from.path) } },
            data: {
              itemCount: { decrement: 1 },
              totalSize: { decrement: source.size },
            },
          });
        }
      }
      await tx.file.delete({ where: { id: source.id } });
    });
    await Promise.all(versions.map((version) => this.storage.deleteObject(version.storageKey)));
    await this.analysis.notifyFolderContentsChanged(userId, source.folderId, source.dataRoomId).catch(() => undefined);
    return replaced;
  }

  async remove(userId: string, id: string) {
    const file = await this.access.getFileOrThrow(id);
    await this.access.assertCanEdit(userId, file.dataRoomId);
    const versions = await this.prisma.fileVersion.findMany({ where: { fileId: id } });
    await this.prisma.$transaction(async (tx) => {
      if (file.folderId) {
        const folder = await tx.folder.findUnique({ where: { id: file.folderId } });
        if (folder) {
          await tx.folder.updateMany({
            where: { id: { in: ancestorIdsFromPath(folder.path) } },
            data: {
              itemCount: { decrement: 1 },
              totalSize: { decrement: file.size },
            },
          });
        }
      }
      await tx.file.delete({ where: { id } });
    });
    await this.storage.deleteObject(file.storageKey);
    await Promise.all(versions.map((v) => this.storage.deleteObject(v.storageKey)));
    await this.analysis.notifyFolderContentsChanged(userId, file.folderId, file.dataRoomId).catch(() => undefined);
    return { deleted: true };
  }

  async addVersion(userId: string, fileId: string, storageKey: string, size: bigint) {
    const file = await this.access.getFileOrThrow(fileId);
    await this.access.assertCanEdit(userId, file.dataRoomId);
    const last = await this.prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: 'desc' },
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      if (!last) {
        await tx.fileVersion.create({
          data: {
            fileId,
            version: 1,
            storageKey: file.storageKey,
            size: file.size,
          },
        });
      }
      const nextVersion = last ? last.version + 1 : 2;
      await tx.fileVersion.create({
        data: { fileId, version: nextVersion, storageKey, size },
      });
      const next = await tx.file.update({
        where: { id: fileId },
        data: { storageKey, size },
      });
      const delta = size - file.size;
      if (file.folderId && delta !== 0n) {
        const folder = await tx.folder.findUnique({ where: { id: file.folderId } });
        if (folder) {
          await tx.folder.updateMany({
            where: { id: { in: ancestorIdsFromPath(folder.path) } },
            data: { totalSize: { increment: delta } },
          });
        }
      }
      return next;
    });
    await this.queueFile(userId, updated);
    return serializeFile(updated);
  }

  async search(userId: string, dataRoomId: string, q: string) {
    const { access } = await this.access.assertCanView({ userId, dataRoomId });
    const query = q.trim();
    if (!query) return { folders: [], files: [] };

    const folders = await this.prisma.folder.findMany({
      where: {
        dataRoomId,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    const files = await this.prisma.file.findMany({
      where: {
        dataRoomId,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    if (access === 'OWNER') {
      return {
        folders: folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })),
        files: files.map((f) => ({ id: f.id, name: f.name, folderId: f.folderId, size: f.size.toString() })),
      };
    }

    const visibleFolders: typeof folders = [];
    for (const folder of folders) {
      try {
        await this.access.assertCanView({ userId, dataRoomId, folderId: folder.id });
        visibleFolders.push(folder);
      } catch {
        /* hidden */
      }
    }
    const visibleFiles: typeof files = [];
    for (const file of files) {
      try {
        await this.access.assertCanView({
          userId,
          dataRoomId,
          fileId: file.id,
          folderId: file.folderId,
        });
        visibleFiles.push(file);
      } catch {
        /* hidden */
      }
    }
    return {
      folders: visibleFolders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })),
      files: visibleFiles.map((f) => ({ id: f.id, name: f.name, folderId: f.folderId, size: f.size.toString() })),
    };
  }

  async versions(userId: string, fileId: string) {
    const file = await this.access.getFileOrThrow(fileId);
    await this.access.assertCanView({ userId, dataRoomId: file.dataRoomId, fileId: file.id });
    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { version: 'desc' },
    });
    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      size: v.size.toString(),
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async versionUrl(userId: string, fileId: string, versionId: string) {
    const file = await this.access.getFileOrThrow(fileId);
    await this.access.assertCanView({ userId, dataRoomId: file.dataRoomId, fileId: file.id });
    const version = await this.prisma.fileVersion.findFirst({ where: { id: versionId, fileId } });
    if (!version) throw new NotFoundException(t('versionNotFound'));
    if (!(await this.storage.exists(version.storageKey))) {
      throw new NotFoundException(t('blobMissing'));
    }
    const url = await this.storage.signDownload(version.storageKey, file.name);
    return { url, version: version.version, size: version.size.toString() };
  }

  private async queueFile(userId: string, file: { id: string; folderId: string | null; dataRoomId: string }) {
    await this.analysis.notifyFileChanged(userId, file).catch(() => undefined);
  }
}

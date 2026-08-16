import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowUnique } from '../common/prisma-errors';
import {
  ancestorIdsFromPath,
  serializeFile,
  serializeFolder,
  serializeRoom,
} from '../common/serialize';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(userId: string, dataRoomId: string, dto: CreateFolderDto) {
    await this.access.assertCanEdit(userId, dataRoomId);
    const parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.access.getFolderOrThrow(parentId);
      if (parent.dataRoomId !== dataRoomId) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    try {
      const folder = await this.prisma.$transaction(async (tx) => {
        const created = await tx.folder.create({
          data: {
            dataRoomId,
            parentId,
            name: dto.name.trim(),
            path: '/pending/',
          },
        });
        const parent = parentId ? await tx.folder.findUnique({ where: { id: parentId } }) : null;
        const path = parent ? `${parent.path}${created.id}/` : `/${created.id}/`;
        const updated = await tx.folder.update({ where: { id: created.id }, data: { path } });
        if (parent) {
          const ids = ancestorIdsFromPath(parent.path);
          await tx.folder.updateMany({
            where: { id: { in: ids } },
            data: { itemCount: { increment: 1 } },
          });
        }
        return updated;
      });
      return serializeFolder(folder);
    } catch (error) {
      rethrowUnique(error, 'A folder with this name already exists here');
    }
  }

  async get(userId: string | null, id: string, publicToken?: string) {
    const folder = await this.access.getFolderOrThrow(id);
    const { access, room } = await this.access.assertCanView({
      userId,
      publicToken,
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
    });

    const folders = await this.prisma.folder.findMany({
      where: { parentId: folder.id },
      orderBy: { name: 'asc' },
    });
    const files = await this.prisma.file.findMany({
      where: { folderId: folder.id },
      orderBy: { name: 'asc' },
    });

    const ancestors = await this.prisma.folder.findMany({
      where: { id: { in: ancestorIdsFromPath(folder.path) } },
    });
    const byId = new Map(ancestors.map((a) => [a.id, a]));
    const breadcrumbs = [
      { id: room.id, name: room.name },
      ...ancestorIdsFromPath(folder.path).map((fid) => ({
        id: fid,
        name: byId.get(fid)?.name ?? 'Folder',
      })),
    ];

    return {
      folder: serializeFolder(folder, room.owner),
      dataRoom: serializeRoom(room, access),
      breadcrumbs,
      folders: folders.map((f) => serializeFolder(f, room.owner)),
      files: files.map((f) => serializeFile(f, room.owner)),
      access,
    };
  }

  async update(userId: string, id: string, dto: UpdateFolderDto) {
    const folder = await this.access.getFolderOrThrow(id);
    await this.access.assertCanEdit(userId, folder.dataRoomId);
    try {
      const updated = await this.prisma.folder.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
      return serializeFolder(updated);
    } catch (error) {
      rethrowUnique(error, 'A folder with this name already exists here');
    }
  }

  async deletionPreview(userId: string, id: string) {
    const folder = await this.access.getFolderOrThrow(id);
    await this.access.assertCanEdit(userId, folder.dataRoomId);

    const nestedFolders = await this.prisma.folder.findMany({
      where: { dataRoomId: folder.dataRoomId, path: { startsWith: folder.path } },
      select: { id: true, name: true },
    });
    const files = await this.prisma.file.findMany({
      where: {
        dataRoomId: folder.dataRoomId,
        OR: [{ folderId: { in: nestedFolders.map((f) => f.id) } }],
      },
      select: { id: true, name: true, size: true },
    });

    const sampleNames = [
      ...nestedFolders.slice(0, 5).map((f) => f.name),
      ...files.slice(0, 5).map((f) => f.name),
    ].slice(0, 8);

    return {
      folderCount: nestedFolders.length,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0n).toString(),
      sampleNames,
    };
  }

  async remove(userId: string, id: string) {
    const folder = await this.access.getFolderOrThrow(id);
    await this.access.assertCanEdit(userId, folder.dataRoomId);

    const nestedFolders = await this.prisma.folder.findMany({
      where: { dataRoomId: folder.dataRoomId, path: { startsWith: folder.path } },
      select: { id: true },
    });
    const files = await this.prisma.file.findMany({
      where: { folderId: { in: nestedFolders.map((f) => f.id) } },
      select: { storageKey: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (folder.parentId) {
        const parent = await tx.folder.findUnique({ where: { id: folder.parentId } });
        if (parent) {
          const ids = ancestorIdsFromPath(parent.path);
          await tx.folder.updateMany({
            where: { id: { in: ids } },
            data: {
              itemCount: { decrement: folder.itemCount + 1 },
              totalSize: { decrement: folder.totalSize },
            },
          });
        }
      }
      await tx.folder.delete({ where: { id } });
    });

    return { deleted: true, storageKeys: files.map((f) => f.storageKey) };
  }

  async tree(userId: string, dataRoomId: string, parentId?: string | null) {
    await this.access.assertCanView({ userId, dataRoomId, folderId: parentId ?? undefined });
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId, parentId: parentId ?? null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, parentId: true, itemCount: true },
    });
    return folders;
  }
}

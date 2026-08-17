import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowUnique } from '../common/prisma-errors';
import { ancestorIdsFromPath, serializeFile, serializeFolder, serializeRoom } from '../common/serialize';
import { listFolderPage } from '../common/listing-page';
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
        throw new NotFoundException('Батьківську папку не знайдено');
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
      rethrowUnique(error, 'Папка з такою назвою вже існує тут');
    }
  }

  async get(userId: string | null, id: string, publicToken?: string, page = 1, pageSize = 20) {
    const folder = await this.access.getFolderOrThrow(id);
    const { access, room } = await this.access.assertCanView({
      userId,
      publicToken,
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
    });

    const paged = await listFolderPage(this.prisma, {
      dataRoomId: folder.dataRoomId,
      parentId: folder.id,
      page,
      pageSize,
    });

    const ancestors = await this.prisma.folder.findMany({
      where: { id: { in: ancestorIdsFromPath(folder.path) } },
    });
    const byId = new Map(ancestors.map((a) => [a.id, a]));
    const breadcrumbs = [
      { id: room.id, name: room.name },
      ...ancestorIdsFromPath(folder.path).map((fid) => ({
        id: fid,
        name: byId.get(fid)?.name ?? 'Папка',
      })),
    ];

    return {
      folder: serializeFolder(folder, room.owner),
      dataRoom: serializeRoom(room, access),
      breadcrumbs,
      folders: paged.folders.map((f) => serializeFolder(f, room.owner)),
      files: paged.files.map((f) => serializeFile(f, room.owner)),
      access,
      page: paged.page,
      pageSize: paged.pageSize,
      total: paged.total,
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
      rethrowUnique(error, 'Папка з такою назвою вже існує тут');
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
      viewers: await this.viewerAccess(
        nestedFolders.map((f) => f.id),
        files.map((f) => f.id),
      ),
    };
  }

  async remove(userId: string, id: string, confirmViewers = false) {
    const folder = await this.access.getFolderOrThrow(id);
    await this.access.assertCanEdit(userId, folder.dataRoomId);

    const nestedFolders = await this.prisma.folder.findMany({
      where: { dataRoomId: folder.dataRoomId, path: { startsWith: folder.path } },
      select: { id: true },
    });
    const files = await this.prisma.file.findMany({
      where: { folderId: { in: nestedFolders.map((f) => f.id) } },
      select: { id: true, storageKey: true },
    });

    const viewers = await this.viewerAccess(
      nestedFolders.map((f) => f.id),
      files.map((f) => f.id),
    );
    if (viewers.publicLinkCount + viewers.peopleCount > 0 && !confirmViewers) {
      throw new ConflictException(
        'Цю папку зараз можуть переглядати інші. Підтвердьте відкликання доступу з правами власника, щоб видалити.',
      );
    }

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

  private async viewerAccess(folderIds: string[], fileIds: string[]) {
    if (folderIds.length === 0 && fileIds.length === 0) {
      return { publicLinkCount: 0, peopleCount: 0, people: [] as string[] };
    }
    const shares = await this.prisma.share.findMany({
      where: {
        revokedAt: null,
        OR: [
          ...(folderIds.length ? [{ resourceType: 'FOLDER' as const, resourceId: { in: folderIds } }] : []),
          ...(fileIds.length ? [{ resourceType: 'FILE' as const, resourceId: { in: fileIds } }] : []),
        ],
      },
      include: { user: { select: { email: true } } },
    });
    const people = [
      ...new Set(
        shares
          .filter((share) => share.kind === 'USER')
          .map((share) => share.user?.email || share.invitedEmail)
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    return {
      publicLinkCount: shares.filter((share) => share.kind === 'PUBLIC_LINK').length,
      peopleCount: people.length,
      people: people.slice(0, 8),
    };
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

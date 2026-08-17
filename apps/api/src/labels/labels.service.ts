import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowUnique } from '../common/prisma-errors';
import { t } from '../i18n/t';
import { AssignTagsDto, CreateTagDefDto, UpdateTagDefDto } from './dto/tags.dto';
import { AssignStatusDto, CreateStatusDefDto, UpdateStatusDefDto } from './dto/statuses.dto';

const DEFAULT_TAGS = ['Type1', 'Type2', 'Type3'];
const DEFAULT_STATUSES = ['Approved', 'For discussion', 'For deletion'];

export type TagDto = { id: string; name: string };

@Injectable()
export class LabelsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async listCatalog(userId: string) {
    await this.ensureDefaults(userId);
    const rows = await this.prisma.tagDef.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(serializeTag);
  }

  async createTag(userId: string, dto: CreateTagDefDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException(t('tagEmpty'));
    const last = await this.prisma.tagDef.aggregate({ where: { userId }, _max: { sortOrder: true } });
    try {
      return serializeTag(
        await this.prisma.tagDef.create({
          data: { userId, name, sortOrder: (last._max.sortOrder ?? -1) + 1 },
        }),
      );
    } catch (error) {
      rethrowUnique(error, t('tagNameTaken'));
    }
  }

  async updateTag(userId: string, id: string, dto: UpdateTagDefDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException(t('tagEmpty'));
    await this.getOwnedTag(userId, id);
    try {
      return serializeTag(await this.prisma.tagDef.update({ where: { id }, data: { name } }));
    } catch (error) {
      rethrowUnique(error, t('tagNameTaken'));
    }
  }

  async deleteTag(userId: string, id: string) {
    await this.getOwnedTag(userId, id);
    await this.prisma.tagDef.delete({ where: { id } });
    return { deleted: true };
  }

  async assign(userId: string, dto: AssignTagsDto) {
    const ctx = await this.resolveResource(userId, dto.resourceType, dto.resourceId);
    await this.access.assertCanEdit(userId, ctx.dataRoomId);
    const uniqueIds = [...new Set(dto.tagIds)];
    const owned = await this.prisma.tagDef.findMany({
      where: { userId, id: { in: uniqueIds } },
      select: { id: true },
    });
    if (owned.length !== uniqueIds.length) throw new NotFoundException(t('tagNotFound'));
    await this.prisma.$transaction(async (tx) => {
      await tx.resourceTag.deleteMany({
        where: { resourceType: dto.resourceType, resourceId: dto.resourceId },
      });
      if (uniqueIds.length === 0) return;
      await tx.resourceTag.createMany({
        data: uniqueIds.map((tagId) => ({
          tagId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          fileId: dto.resourceType === 'FILE' ? dto.resourceId : null,
          folderId: dto.resourceType === 'FOLDER' ? dto.resourceId : null,
        })),
      });
    });
    return this.tagsFor(dto.resourceType, [dto.resourceId]).then((map) => map.get(dto.resourceId) ?? []);
  }

  async listStatusCatalog(userId: string) {
    await this.ensureStatusDefaults(userId);
    const rows = await this.prisma.statusDef.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(serializeTag);
  }

  async createStatus(userId: string, dto: CreateStatusDefDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException(t('statusEmpty'));
    const last = await this.prisma.statusDef.aggregate({ where: { userId }, _max: { sortOrder: true } });
    try {
      return serializeTag(
        await this.prisma.statusDef.create({
          data: { userId, name, sortOrder: (last._max.sortOrder ?? -1) + 1 },
        }),
      );
    } catch (error) {
      rethrowUnique(error, t('statusNameTaken'));
    }
  }

  async updateStatus(userId: string, id: string, dto: UpdateStatusDefDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException(t('statusEmpty'));
    await this.getOwnedStatus(userId, id);
    try {
      return serializeTag(await this.prisma.statusDef.update({ where: { id }, data: { name } }));
    } catch (error) {
      rethrowUnique(error, t('statusNameTaken'));
    }
  }

  async deleteStatus(userId: string, id: string) {
    await this.getOwnedStatus(userId, id);
    await this.prisma.statusDef.delete({ where: { id } });
    return { deleted: true };
  }

  async assignStatus(userId: string, dto: AssignStatusDto) {
    const ctx = await this.resolveResource(userId, dto.resourceType, dto.resourceId);
    await this.access.assertCanEdit(userId, ctx.dataRoomId);
    if (dto.statusId) {
      const owned = await this.prisma.statusDef.findFirst({ where: { id: dto.statusId, userId } });
      if (!owned) throw new NotFoundException(t('statusNotFound'));
      await this.prisma.resourceStatus.upsert({
        where: {
          resourceType_resourceId: { resourceType: dto.resourceType, resourceId: dto.resourceId },
        },
        create: {
          statusId: dto.statusId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          fileId: dto.resourceType === 'FILE' ? dto.resourceId : null,
          folderId: dto.resourceType === 'FOLDER' ? dto.resourceId : null,
        },
        update: { statusId: dto.statusId },
      });
    } else {
      await this.prisma.resourceStatus.deleteMany({
        where: { resourceType: dto.resourceType, resourceId: dto.resourceId },
      });
    }
    const map = await this.statusesFor(dto.resourceType, [dto.resourceId]);
    return map.get(dto.resourceId) ?? null;
  }

  async withTags<T extends { id: string }>(resourceType: ResourceType, item: T) {
    const [tagMap, statusMap] = await Promise.all([
      this.tagsFor(resourceType, [item.id]),
      this.statusesFor(resourceType, [item.id]),
    ]);
    return { ...item, tags: tagMap.get(item.id) ?? [], status: statusMap.get(item.id) ?? null };
  }

  async decorateListing<
    T extends { folders: { id: string }[]; files: { id: string }[]; folder?: { id: string } | null },
  >(listing: T) {
    const folderIds = listing.folders.map((folder) => folder.id);
    if (listing.folder?.id) folderIds.push(listing.folder.id);
    const fileIds = listing.files.map((file) => file.id);
    const [folderMap, fileMap, folderStatus, fileStatus] = await Promise.all([
      this.tagsFor('FOLDER', folderIds),
      this.tagsFor('FILE', fileIds),
      this.statusesFor('FOLDER', folderIds),
      this.statusesFor('FILE', fileIds),
    ]);
    return {
      ...listing,
      folder: listing.folder
        ? {
            ...listing.folder,
            tags: folderMap.get(listing.folder.id) ?? [],
            status: folderStatus.get(listing.folder.id) ?? null,
          }
        : listing.folder,
      folders: listing.folders.map((folder) => ({
        ...folder,
        tags: folderMap.get(folder.id) ?? [],
        status: folderStatus.get(folder.id) ?? null,
      })),
      files: listing.files.map((file) => ({
        ...file,
        tags: fileMap.get(file.id) ?? [],
        status: fileStatus.get(file.id) ?? null,
      })),
    };
  }

  private async tagsFor(resourceType: ResourceType, ids: string[]) {
    const map = new Map<string, TagDto[]>();
    for (const id of ids) map.set(id, []);
    if (ids.length === 0) return map;
    const rows = await this.prisma.resourceTag.findMany({
      where: { resourceType, resourceId: { in: ids } },
      include: { tag: { select: { id: true, name: true, sortOrder: true } } },
    });
    rows.sort((a, b) => a.tag.sortOrder - b.tag.sortOrder || a.tag.name.localeCompare(b.tag.name));
    for (const row of rows) {
      map.get(row.resourceId)?.push({ id: row.tag.id, name: row.tag.name });
    }
    return map;
  }

  private async statusesFor(resourceType: ResourceType, ids: string[]) {
    const map = new Map<string, TagDto | null>();
    for (const id of ids) map.set(id, null);
    if (ids.length === 0) return map;
    const rows = await this.prisma.resourceStatus.findMany({
      where: { resourceType, resourceId: { in: ids } },
      include: { status: { select: { id: true, name: true } } },
    });
    for (const row of rows) {
      map.set(row.resourceId, { id: row.status.id, name: row.status.name });
    }
    return map;
  }

  private async ensureDefaults(userId: string) {
    const count = await this.prisma.tagDef.count({ where: { userId } });
    if (count > 0) return;
    await this.prisma.tagDef.createMany({
      data: DEFAULT_TAGS.map((name, sortOrder) => ({ userId, name, sortOrder })),
    });
  }

  private async ensureStatusDefaults(userId: string) {
    const count = await this.prisma.statusDef.count({ where: { userId } });
    if (count > 0) return;
    await this.prisma.statusDef.createMany({
      data: DEFAULT_STATUSES.map((name, sortOrder) => ({ userId, name, sortOrder })),
    });
  }

  private async getOwnedStatus(userId: string, id: string) {
    const row = await this.prisma.statusDef.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException(t('statusNotFound'));
    return row;
  }

  private async getOwnedTag(userId: string, id: string) {
    const row = await this.prisma.tagDef.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException(t('tagNotFound'));
    return row;
  }

  private async resolveResource(userId: string, resourceType: ResourceType, resourceId: string) {
    if (resourceType === 'FILE') {
      const file = await this.access.getFileOrThrow(resourceId);
      return { dataRoomId: file.dataRoomId };
    }
    if (resourceType === 'FOLDER') {
      const folder = await this.access.getFolderOrThrow(resourceId);
      return { dataRoomId: folder.dataRoomId };
    }
    throw new BadRequestException(t('tagResourceInvalid'));
  }
}

function serializeTag(row: { id: string; name: string }): TagDto {
  return { id: row.id, name: row.name };
}

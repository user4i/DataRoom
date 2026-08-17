import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowUnique } from '../common/prisma-errors';
import { t } from '../i18n/t';
import { AssignTagsDto, CreateTagDefDto, UpdateTagDefDto } from './dto/tags.dto';
import { AssignStatusDto, CreateStatusDefDto, UpdateStatusDefDto } from './dto/statuses.dto';
import { AssignRelationsDto } from './dto/relations.dto';

const DEFAULT_TAGS = ['Type1', 'Type2', 'Type3'];
const DEFAULT_STATUSES = ['Approved', 'For discussion', 'For deletion'];

export type TagDto = { id: string; name: string };
export type RelatedDto = {
  resourceType: 'FILE' | 'FOLDER';
  resourceId: string;
  name: string;
  dataRoomId: string;
};

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

  async assignRelations(userId: string, dto: AssignRelationsDto) {
    const ctx = await this.resolveResource(userId, dto.resourceType, dto.resourceId);
    await this.access.assertCanEdit(userId, ctx.dataRoomId);
    const unique = new Map<string, { resourceType: 'FILE' | 'FOLDER'; resourceId: string }>();
    for (const item of dto.items) {
      if (item.resourceType === dto.resourceType && item.resourceId === dto.resourceId) {
        throw new BadRequestException(t('relationSelf'));
      }
      unique.set(`${item.resourceType}:${item.resourceId}`, item);
    }
    const targets = [...unique.values()];
    const fileIds = targets.filter((item) => item.resourceType === 'FILE').map((item) => item.resourceId);
    const folderIds = targets.filter((item) => item.resourceType === 'FOLDER').map((item) => item.resourceId);
    const [files, folders] = await Promise.all([
      fileIds.length
        ? this.prisma.file.findMany({ where: { id: { in: fileIds } }, select: { id: true, dataRoomId: true } })
        : Promise.resolve([]),
      folderIds.length
        ? this.prisma.folder.findMany({ where: { id: { in: folderIds } }, select: { id: true, dataRoomId: true } })
        : Promise.resolve([]),
    ]);
    if (files.length !== fileIds.length || folders.length !== folderIds.length) {
      throw new NotFoundException(t('relationNotFound'));
    }
    if ([...files, ...folders].some((row) => row.dataRoomId !== ctx.dataRoomId)) {
      throw new BadRequestException(t('relationRoomMismatch'));
    }

    const source = { type: dto.resourceType, id: dto.resourceId };
    const rows = targets.map((item) => {
      const [left, right] = orderedPair(source, { type: item.resourceType, id: item.resourceId });
      return {
        dataRoomId: ctx.dataRoomId,
        ...linkSides(left, right),
      };
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.resourceLink.deleteMany({
        where: {
          OR: [
            { leftType: dto.resourceType, leftId: dto.resourceId },
            { rightType: dto.resourceType, rightId: dto.resourceId },
          ],
        },
      });
      if (rows.length) await tx.resourceLink.createMany({ data: rows });
    });
    const map = await this.relationsFor(dto.resourceType, [dto.resourceId]);
    return map.get(dto.resourceId) ?? [];
  }

  async withTags<T extends { id: string }>(resourceType: ResourceType, item: T) {
    const [tagMap, statusMap, relationMap] = await Promise.all([
      this.tagsFor(resourceType, [item.id]),
      this.statusesFor(resourceType, [item.id]),
      this.relationsFor(resourceType, [item.id]),
    ]);
    return {
      ...item,
      tags: tagMap.get(item.id) ?? [],
      status: statusMap.get(item.id) ?? null,
      relations: relationMap.get(item.id) ?? [],
    };
  }

  async decorateListing<
    T extends { folders: { id: string }[]; files: { id: string }[]; folder?: { id: string } | null },
  >(listing: T) {
    const folderIds = listing.folders.map((folder) => folder.id);
    if (listing.folder?.id) folderIds.push(listing.folder.id);
    const fileIds = listing.files.map((file) => file.id);
    const [folderMap, fileMap, folderStatus, fileStatus, folderRelations, fileRelations] = await Promise.all([
      this.tagsFor('FOLDER', folderIds),
      this.tagsFor('FILE', fileIds),
      this.statusesFor('FOLDER', folderIds),
      this.statusesFor('FILE', fileIds),
      this.relationsFor('FOLDER', folderIds),
      this.relationsFor('FILE', fileIds),
    ]);
    return {
      ...listing,
      folder: listing.folder
        ? {
            ...listing.folder,
            tags: folderMap.get(listing.folder.id) ?? [],
            status: folderStatus.get(listing.folder.id) ?? null,
            relations: folderRelations.get(listing.folder.id) ?? [],
          }
        : listing.folder,
      folders: listing.folders.map((folder) => ({
        ...folder,
        tags: folderMap.get(folder.id) ?? [],
        status: folderStatus.get(folder.id) ?? null,
        relations: folderRelations.get(folder.id) ?? [],
      })),
      files: listing.files.map((file) => ({
        ...file,
        tags: fileMap.get(file.id) ?? [],
        status: fileStatus.get(file.id) ?? null,
        relations: fileRelations.get(file.id) ?? [],
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

  private async relationsFor(resourceType: ResourceType, ids: string[]) {
    const map = new Map<string, RelatedDto[]>();
    for (const id of ids) map.set(id, []);
    if (ids.length === 0) return map;
    const rows = await this.prisma.resourceLink.findMany({
      where: {
        OR: [
          { leftType: resourceType, leftId: { in: ids } },
          { rightType: resourceType, rightId: { in: ids } },
        ],
      },
    });
    const fileIds = new Set<string>();
    const folderIds = new Set<string>();
    const pending = new Map<string, { resourceType: 'FILE' | 'FOLDER'; resourceId: string }[]>();
    const add = (sourceType: ResourceType, sourceId: string, otherType: ResourceType, otherId: string) => {
      if (sourceType !== resourceType || !map.has(sourceId)) return;
      const list = pending.get(sourceId) ?? [];
      list.push({ resourceType: otherType as 'FILE' | 'FOLDER', resourceId: otherId });
      pending.set(sourceId, list);
      if (otherType === 'FILE') fileIds.add(otherId);
      if (otherType === 'FOLDER') folderIds.add(otherId);
    };
    for (const row of rows) {
      add(row.leftType, row.leftId, row.rightType, row.rightId);
      add(row.rightType, row.rightId, row.leftType, row.leftId);
    }
    const [files, folders] = await Promise.all([
      fileIds.size
        ? this.prisma.file.findMany({
            where: { id: { in: [...fileIds] } },
            select: { id: true, name: true, dataRoomId: true },
          })
        : Promise.resolve([]),
      folderIds.size
        ? this.prisma.folder.findMany({
            where: { id: { in: [...folderIds] } },
            select: { id: true, name: true, dataRoomId: true },
          })
        : Promise.resolve([]),
    ]);
    const fileById = new Map(files.map((row) => [row.id, row]));
    const folderById = new Map(folders.map((row) => [row.id, row]));
    for (const [id, refs] of pending) {
      const related: RelatedDto[] = [];
      for (const ref of refs) {
        const row = ref.resourceType === 'FILE' ? fileById.get(ref.resourceId) : folderById.get(ref.resourceId);
        if (!row) continue;
        related.push({
          resourceType: ref.resourceType,
          resourceId: ref.resourceId,
          name: row.name,
          dataRoomId: row.dataRoomId,
        });
      }
      related.sort((a, b) => a.name.localeCompare(b.name) || a.resourceType.localeCompare(b.resourceType));
      map.set(id, related);
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

type LinkRef = { type: 'FILE' | 'FOLDER'; id: string };

function pairKey(ref: LinkRef) {
  return `${ref.type}:${ref.id}`;
}

function orderedPair(a: LinkRef, b: LinkRef): [LinkRef, LinkRef] {
  return pairKey(a) <= pairKey(b) ? [a, b] : [b, a];
}

function linkSides(left: LinkRef, right: LinkRef) {
  return {
    leftType: left.type,
    leftId: left.id,
    rightType: right.type,
    rightId: right.id,
    leftFileId: left.type === 'FILE' ? left.id : null,
    leftFolderId: left.type === 'FOLDER' ? left.id : null,
    rightFileId: right.type === 'FILE' ? right.id : null,
    rightFolderId: right.type === 'FOLDER' ? right.id : null,
  };
}

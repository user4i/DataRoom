import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { serializeFile, serializeFolder, serializeRoom } from '../common/serialize';
import { listFolderPage } from '../common/listing-page';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { AnalysisService } from '../ai/analysis.service';
import { DevService } from '../dev/dev.service';

@Injectable()
export class DataRoomsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private analysis: AnalysisService,
    private dev: DevService,
  ) {}

  async create(userId: string, dto: CreateRoomDto) {
    const existingRooms = await this.prisma.dataRoom.count();
    const room = await this.prisma.dataRoom.create({
      data: { name: dto.name.trim(), ownerId: userId },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (existingRooms === 0) {
      await this.dev.populate(room.id, 'heavy');
    }
    return serializeRoom(room, 'OWNER');
  }

  async list(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const owned = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId },
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const shares = await this.prisma.share.findMany({
      where: {
        revokedAt: null,
        kind: 'USER',
        OR: [{ userId }, ...(user ? [{ invitedEmail: user.email }] : [])],
      },
    });

    const roomIds = new Set<string>();
    for (const share of shares) {
      if (share.resourceType === 'DATA_ROOM') roomIds.add(share.resourceId);
      else if (share.dataRoomId) roomIds.add(share.dataRoomId);
      else if (share.folderId) {
        const folder = await this.prisma.folder.findUnique({ where: { id: share.folderId } });
        if (folder) roomIds.add(folder.dataRoomId);
      } else if (share.fileId) {
        const file = await this.prisma.file.findUnique({ where: { id: share.fileId } });
        if (file) roomIds.add(file.dataRoomId);
      } else {
        if (share.resourceType === 'FOLDER') {
          const folder = await this.prisma.folder.findUnique({ where: { id: share.resourceId } });
          if (folder) roomIds.add(folder.dataRoomId);
        }
        if (share.resourceType === 'FILE') {
          const file = await this.prisma.file.findUnique({ where: { id: share.resourceId } });
          if (file) roomIds.add(file.dataRoomId);
        }
      }
    }

    const ownedIds = new Set(owned.map((r) => r.id));
    const sharedRooms = await this.prisma.dataRoom.findMany({
      where: { id: { in: [...roomIds].filter((id) => !ownedIds.has(id)) } },
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      owned: owned.map((r) => serializeRoom(r, 'OWNER')),
      shared: sharedRooms.map((r) => serializeRoom(r, 'VIEWER')),
    };
  }

  async get(userId: string, id: string) {
    const { access, room } = await this.access.assertCanView({ userId, dataRoomId: id });
    return serializeRoom(room, access);
  }

  async update(userId: string, id: string, dto: UpdateRoomDto) {
    await this.access.assertCanEdit(userId, id);
    const room = await this.prisma.dataRoom.update({
      where: { id },
      data: { name: dto.name.trim() },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    return serializeRoom(room, 'OWNER');
  }

  async remove(userId: string, id: string) {
    await this.access.assertCanEdit(userId, id);
    const files = await this.prisma.file.findMany({ where: { dataRoomId: id }, select: { storageKey: true } });
    await this.prisma.dataRoom.delete({ where: { id } });
    return { deleted: true, storageKeys: files.map((f) => f.storageKey) };
  }

  async listing(
    userId: string | null,
    roomId: string,
    publicToken?: string,
    page = 1,
    pageSize = 20,
    q?: string,
  ) {
    const { access, room } = await this.access.assertCanView({
      userId,
      publicToken,
      dataRoomId: roomId,
    });
    const paged = await listFolderPage(this.prisma, {
      dataRoomId: roomId,
      parentId: null,
      page,
      pageSize,
      q,
    });
    return this.analysis.decorateListing({
      folder: null,
      dataRoom: serializeRoom(room, access),
      breadcrumbs: [{ id: room.id, name: room.name }],
      folders: paged.folders.map((f) => serializeFolder(f, room.owner)),
      files: paged.files.map((f) => serializeFile(f, room.owner)),
      access,
      page: paged.page,
      pageSize: paged.pageSize,
      total: paged.total,
    });
  }
}

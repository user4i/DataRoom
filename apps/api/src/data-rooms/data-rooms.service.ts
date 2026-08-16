import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { serializeFile, serializeFolder, serializeRoom } from '../common/serialize';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class DataRoomsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(userId: string, dto: CreateRoomDto) {
    const room = await this.prisma.dataRoom.create({
      data: { name: dto.name.trim(), ownerId: userId },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
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

  async listing(userId: string | null, roomId: string, publicToken?: string) {
    const { access, room } = await this.access.assertCanView({
      userId,
      publicToken,
      dataRoomId: roomId,
    });
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId, parentId: null },
      orderBy: { name: 'asc' },
    });
    const files = await this.prisma.file.findMany({
      where: { dataRoomId: roomId, folderId: null },
      orderBy: { name: 'asc' },
    });
    return {
      folder: null,
      dataRoom: serializeRoom(room, access),
      breadcrumbs: [{ id: room.id, name: room.name }],
      folders: folders.map((f) => serializeFolder(f, room.owner)),
      files: files.map((f) => serializeFile(f, room.owner)),
      access,
    };
  }
}

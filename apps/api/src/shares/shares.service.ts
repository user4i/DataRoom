import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceType, ShareKind } from '@prisma/client';
import { nanoid } from 'nanoid';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { FoldersService } from '../folders/folders.service';
import { FilesService } from '../files/files.service';
import { CreateShareDto } from './dto/share.dto';

@Injectable()
export class SharesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private rooms: DataRoomsService,
    private folders: FoldersService,
    private files: FilesService,
  ) {}

  private async resolveResource(resourceType: ResourceType, resourceId: string) {
    if (resourceType === 'DATA_ROOM') {
      const room = await this.access.getRoomOrThrow(resourceId);
      return { dataRoomId: room.id, folderId: null as string | null, fileId: null as string | null, ownerId: room.ownerId };
    }
    if (resourceType === 'FOLDER') {
      const folder = await this.access.getFolderOrThrow(resourceId);
      const room = await this.access.getRoomOrThrow(folder.dataRoomId);
      return { dataRoomId: folder.dataRoomId, folderId: folder.id, fileId: null, ownerId: room.ownerId };
    }
    const file = await this.access.getFileOrThrow(resourceId);
    const room = await this.access.getRoomOrThrow(file.dataRoomId);
    return { dataRoomId: file.dataRoomId, folderId: file.folderId, fileId: file.id, ownerId: room.ownerId };
  }

  serialize(share: {
    id: string;
    resourceType: ResourceType;
    resourceId: string;
    kind: ShareKind;
    role: string;
    token: string | null;
    userId: string | null;
    invitedEmail: string | null;
    createdAt: Date;
    user?: { id: string; name: string; email: string } | null;
  }) {
    return {
      id: share.id,
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      kind: share.kind,
      role: share.role,
      token: share.token,
      userId: share.userId,
      invitedEmail: share.invitedEmail,
      createdAt: share.createdAt.toISOString(),
      user: share.user ?? null,
    };
  }

  async create(userId: string, dto: CreateShareDto) {
    const resource = await this.resolveResource(dto.resourceType, dto.resourceId);
    if (resource.ownerId !== userId) {
      throw new ForbiddenException('Лише власник може надавати доступ');
    }

    if (dto.kind === 'PUBLIC_LINK') {
      const existing = await this.prisma.share.findFirst({
        where: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          kind: 'PUBLIC_LINK',
          revokedAt: null,
        },
      });
      if (existing) return this.serialize(existing);

      const created = await this.prisma.share.create({
        data: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          kind: 'PUBLIC_LINK',
          role: 'VIEWER',
          token: nanoid(21),
          dataRoomId: resource.dataRoomId,
          folderId: resource.folderId,
          fileId: resource.fileId,
        },
      });
      return this.serialize(created);
    }

    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Щоб поділитися з людиною, потрібен email');

    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    if (owner && owner.email === email) {
      throw new BadRequestException('Ви вже власник цього елемента');
    }

    const target = await this.prisma.user.findUnique({ where: { email } });
    const existing = await this.prisma.share.findFirst({
      where: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        kind: 'USER',
        revokedAt: null,
        OR: [{ invitedEmail: email }, ...(target ? [{ userId: target.id }] : [])],
      },
    });
    if (existing) return this.serialize(existing);

    const created = await this.prisma.share.create({
      data: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        kind: 'USER',
        role: 'VIEWER',
        userId: target?.id ?? null,
        invitedEmail: email,
        dataRoomId: resource.dataRoomId,
        folderId: resource.folderId,
        fileId: resource.fileId,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return this.serialize(created);
  }

  async list(userId: string, resourceType: ResourceType, resourceId: string) {
    const resource = await this.resolveResource(resourceType, resourceId);
    if (resource.ownerId !== userId) {
      throw new ForbiddenException('Лише власник може переглядати доступ');
    }
    const shares = await this.prisma.share.findMany({
      where: { resourceType, resourceId, revokedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) => this.serialize(s));
  }

  async revoke(userId: string, id: string) {
    const share = await this.prisma.share.findUnique({ where: { id } });
    if (!share) throw new NotFoundException('Спільний доступ не знайдено');
    const resource = await this.resolveResource(share.resourceType, share.resourceId);
    if (resource.ownerId !== userId) {
      throw new ForbiddenException('Лише власник може скасувати доступ');
    }
    await this.prisma.share.update({ where: { id }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  async inbox(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const shares = await this.prisma.share.findMany({
      where: {
        kind: 'USER',
        revokedAt: null,
        OR: [{ userId }, ...(user ? [{ invitedEmail: user.email }] : [])],
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) => this.serialize(s));
  }

  async byToken(token: string) {
    const share = await this.prisma.share.findFirst({
      where: { token, kind: 'PUBLIC_LINK', revokedAt: null },
    });
    if (!share) throw new NotFoundException('Це посилання більше недоступне');
    return share;
  }

  async publicMeta(token: string) {
    const share = await this.byToken(token);
    if (share.resourceType === 'DATA_ROOM') {
      return {
        share: this.serialize(share),
        listing: await this.rooms.listing(null, share.resourceId, token),
      };
    }
    if (share.resourceType === 'FOLDER') {
      return {
        share: this.serialize(share),
        listing: await this.folders.get(null, share.resourceId, token),
      };
    }
    return {
      share: this.serialize(share),
      file: await this.files.get(null, share.resourceId, token),
    };
  }

  async publicFolder(token: string, folderId: string) {
    await this.byToken(token);
    return this.folders.get(null, folderId, token);
  }

  async publicFile(token: string, fileId: string) {
    await this.byToken(token);
    return this.files.get(null, fileId, token);
  }
}

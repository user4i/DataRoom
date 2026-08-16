import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ancestorIdsFromPath } from '../common/serialize';

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  async getRoomOrThrow(id: string) {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!room) throw new NotFoundException('Кімнату даних не знайдено');
    return room;
  }

  async getFolderOrThrow(id: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Цей елемент більше недоступний');
    return folder;
  }

  async getFileOrThrow(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Цей елемент більше недоступний');
    return file;
  }

  async assertCanEdit(userId: string, dataRoomId: string) {
    const room = await this.getRoomOrThrow(dataRoomId);
    if (room.ownerId !== userId) {
      throw new ForbiddenException('Лише власник може вносити зміни');
    }
    return room;
  }

  async assertCanView(params: {
    userId?: string | null;
    publicToken?: string | null;
    dataRoomId: string;
    folderId?: string | null;
    fileId?: string | null;
  }) {
    const room = await this.getRoomOrThrow(params.dataRoomId);
    if (params.userId && room.ownerId === params.userId) {
      return { access: 'OWNER' as const, room };
    }

    const targets: { resourceType: ResourceType; resourceId: string }[] = [
      { resourceType: 'DATA_ROOM', resourceId: room.id },
    ];

    let folderId = params.folderId ?? null;
    if (params.fileId) {
      const file = await this.getFileOrThrow(params.fileId);
      if (file.dataRoomId !== room.id) {
        throw new NotFoundException('Цей елемент більше недоступний');
      }
      targets.push({ resourceType: 'FILE', resourceId: file.id });
      folderId = folderId ?? file.folderId;
    }

    if (folderId) {
      const folder = await this.getFolderOrThrow(folderId);
      if (folder.dataRoomId !== room.id) {
        throw new NotFoundException('Цей елемент більше недоступний');
      }
      for (const id of ancestorIdsFromPath(folder.path)) {
        targets.push({ resourceType: 'FOLDER', resourceId: id });
      }
    }

    const identity: Prisma.ShareWhereInput[] = [];
    if (params.publicToken) {
      identity.push({ kind: 'PUBLIC_LINK', token: params.publicToken, revokedAt: null });
    }
    if (params.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
      identity.push({ kind: 'USER', userId: params.userId, revokedAt: null });
      if (user) {
        identity.push({ kind: 'USER', invitedEmail: user.email, revokedAt: null });
      }
    }

    if (identity.length === 0) {
      throw new ForbiddenException('У вас немає доступу до цього ресурсу');
    }

    const share = await this.prisma.share.findFirst({
      where: {
        revokedAt: null,
        AND: [{ OR: identity }, { OR: targets }],
      },
    });

    if (!share) {
      throw new ForbiddenException('У вас немає доступу до цього ресурсу');
    }

    return { access: 'VIEWER' as const, room, share };
  }
}

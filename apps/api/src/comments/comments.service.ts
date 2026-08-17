import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser } from '../common/serialize';
import { t } from '../i18n/t';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async list(userId: string | null, publicToken: string | undefined, resourceType: ResourceType, resourceId: string) {
    const ctx = await this.resolve(userId, publicToken, resourceType, resourceId);
    const rows = await this.prisma.comment.findMany({
      where: { resourceType, resourceId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.serialize(row, userId, ctx.ownerId));
  }

  async create(userId: string, dto: CreateCommentDto) {
    const body = dto.body.trim();
    if (!body) throw new BadRequestException(t('commentEmpty'));
    const ctx = await this.resolve(userId, dto.publicToken, dto.resourceType, dto.resourceId);
    const row = await this.prisma.comment.create({
      data: {
        dataRoomId: ctx.dataRoomId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        body,
        authorId: userId,
        fileId: dto.resourceType === 'FILE' ? dto.resourceId : null,
        folderId: dto.resourceType === 'FOLDER' ? dto.resourceId : null,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return this.serialize(row, userId, ctx.ownerId);
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    if (!row) throw new NotFoundException(t('commentNotFound'));
    const room = await this.access.getRoomOrThrow(row.dataRoomId);
    if (row.authorId !== userId && room.ownerId !== userId) {
      throw new ForbiddenException(t('commentDeleteForbidden'));
    }
    await this.prisma.comment.delete({ where: { id } });
    return { deleted: true };
  }

  private async resolve(
    userId: string | null,
    publicToken: string | undefined,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    if (resourceType !== 'FILE' && resourceType !== 'FOLDER') {
      throw new BadRequestException(t('commentResourceInvalid'));
    }
    const file = resourceType === 'FILE' ? await this.access.getFileOrThrow(resourceId) : null;
    const folder = resourceType === 'FOLDER' ? await this.access.getFolderOrThrow(resourceId) : null;
    const dataRoomId = file?.dataRoomId ?? folder!.dataRoomId;
    const { room } = await this.access.assertCanView({
      userId,
      publicToken: publicToken || null,
      dataRoomId,
      fileId: file?.id,
      folderId: folder?.id ?? file?.folderId,
    });
    return { dataRoomId, ownerId: room.ownerId };
  }

  private serialize(
    row: {
      id: string;
      resourceType: ResourceType;
      resourceId: string;
      body: string;
      createdAt: Date;
      authorId: string;
      author: { id: string; name: string; email: string };
    },
    userId: string | null,
    ownerId: string,
  ) {
    return {
      id: row.id,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: serializeUser(row.author),
      mine: userId === row.authorId,
      canDelete: userId === row.authorId || userId === ownerId,
    };
  }
}

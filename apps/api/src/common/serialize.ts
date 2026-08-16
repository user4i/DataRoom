import { DataRoom, File, Folder, User } from '@prisma/client';

export function serializeUser(user: Pick<User, 'id' | 'email' | 'name'>) {
  return { id: user.id, email: user.email, name: user.name };
}

export function serializeRoom(
  room: DataRoom & { owner?: Pick<User, 'id' | 'email' | 'name'> },
  access: 'OWNER' | 'VIEWER',
) {
  return {
    id: room.id,
    name: room.name,
    ownerId: room.ownerId,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    access,
    owner: room.owner ? serializeUser(room.owner) : undefined,
  };
}

export function serializeFolder(folder: Folder) {
  return {
    id: folder.id,
    dataRoomId: folder.dataRoomId,
    parentId: folder.parentId,
    name: folder.name,
    path: folder.path,
    totalSize: folder.totalSize.toString(),
    itemCount: folder.itemCount,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export function serializeFile(file: File) {
  return {
    id: file.id,
    dataRoomId: file.dataRoomId,
    folderId: file.folderId,
    name: file.name,
    size: file.size.toString(),
    mimeType: file.mimeType,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

export function ancestorIdsFromPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

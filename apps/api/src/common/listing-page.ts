import { File, Folder } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ListedFile = File & { _count: { versions: number } };

export const PAGE_SIZES = [10, 20, 30, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export function parseListingPage(page?: string, pageSize?: string) {
  const parsedPage = Number(page);
  const parsedSize = Number(pageSize);
  return {
    page: Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(parsedSize) ? parsedSize : DEFAULT_PAGE_SIZE,
  };
}

export async function listFolderPage(
  prisma: PrismaService,
  args: {
    dataRoomId: string;
    parentId: string | null;
    page: number;
    pageSize: number;
    q?: string;
  },
) {
  const name = args.q?.trim();
  const nameFilter = name ? { name: { contains: name, mode: 'insensitive' as const } } : {};
  const folderWhere = { dataRoomId: args.dataRoomId, parentId: args.parentId, ...nameFilter };
  const fileWhere = { dataRoomId: args.dataRoomId, folderId: args.parentId, ...nameFilter };

  const [folderCount, fileCount] = await Promise.all([
    prisma.folder.count({ where: folderWhere }),
    prisma.file.count({ where: fileWhere }),
  ]);

  const total = folderCount + fileCount;
  const lastPage = Math.max(1, Math.ceil(total / args.pageSize) || 1);
  const page = Math.min(Math.max(1, args.page), lastPage);
  const skip = (page - 1) * args.pageSize;

  let folders: Folder[] = [];
  let files: ListedFile[] = [];

  if (total > 0) {
    if (skip < folderCount) {
      folders = await prisma.folder.findMany({
        where: folderWhere,
        orderBy: { name: 'asc' },
        skip,
        take: Math.min(args.pageSize, folderCount - skip),
      });
      const remaining = args.pageSize - folders.length;
      if (remaining > 0) {
        files = await prisma.file.findMany({
          where: fileWhere,
          orderBy: { name: 'asc' },
          include: { _count: { select: { versions: true } } },
          take: remaining,
        });
      }
    } else {
      files = await prisma.file.findMany({
        where: fileWhere,
        orderBy: { name: 'asc' },
        include: { _count: { select: { versions: true } } },
        skip: skip - folderCount,
        take: args.pageSize,
      });
    }
  }

  return { folders, files, page, pageSize: args.pageSize, total };
}

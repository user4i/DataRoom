import { ancestorIdsFromPath, serializeFile, serializeUser } from './serialize';
import type { File } from '@prisma/client';

describe('serialize helpers', () => {
  it('splits a folder path into ancestor ids', () => {
    expect(ancestorIdsFromPath('/a/b/c')).toEqual(['a', 'b', 'c']);
    expect(ancestorIdsFromPath('')).toEqual([]);
  });

  it('serializes a user', () => {
    expect(serializeUser({ id: '1', email: 'a@b.c', name: 'Ann' })).toEqual({
      id: '1',
      email: 'a@b.c',
      name: 'Ann',
    });
  });

  it('serializes a file size as a string and includes versionCount', () => {
    const now = new Date('2026-01-02T03:04:05.000Z');
    const file = {
      id: 'f1',
      dataRoomId: 'r1',
      folderId: null,
      name: 'a.pdf',
      size: 12n,
      mimeType: 'application/pdf',
      storageKey: 'k',
      createdAt: now,
      updatedAt: now,
    } as File;
    expect(serializeFile(file, undefined, { versionCount: 2 })).toMatchObject({
      id: 'f1',
      size: '12',
      versionCount: 2,
      createdAt: now.toISOString(),
    });
  });
});

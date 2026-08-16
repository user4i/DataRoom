import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowUnique(
  error: unknown,
  message = 'An item with this name already exists here',
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(message);
  }
  throw error;
}

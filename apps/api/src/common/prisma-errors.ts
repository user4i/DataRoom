import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowUnique(
  error: unknown,
  message = 'Елемент із такою назвою вже існує тут',
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(message);
  }
  throw error;
}

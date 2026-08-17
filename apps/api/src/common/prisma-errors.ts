import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { t } from '../i18n/t';

export function rethrowUnique(error: unknown, message = t('uniqueName')): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(message);
  }
  throw error;
}

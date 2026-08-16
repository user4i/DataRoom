import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

/** Blocks this router outside local `nest start --watch` / NODE_ENV=development. */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return true;
  }
}

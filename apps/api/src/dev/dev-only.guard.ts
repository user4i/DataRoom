import { CanActivate, Injectable } from '@nestjs/common';

/** Allows seed/debug routes while this take-home is still a hosted preview. */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

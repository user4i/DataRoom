import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevOnlyGuard } from './dev-only.guard';
import { DevService } from './dev.service';

/** Seed/debug HTTP API. Still JWT-protected; kept on hosted preview for this take-home. */
@Module({
  controllers: [DevController],
  providers: [DevService, DevOnlyGuard],
  exports: [DevService],
})
export class DevModule {}

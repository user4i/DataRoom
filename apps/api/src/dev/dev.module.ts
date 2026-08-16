import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevOnlyGuard } from './dev-only.guard';
import { DevService } from './dev.service';

/** Local seed/debug HTTP API. Not imported when NODE_ENV is production. */
@Module({
  controllers: [DevController],
  providers: [DevService, DevOnlyGuard],
})
export class DevModule {}

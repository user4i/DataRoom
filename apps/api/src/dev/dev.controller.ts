import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { DevOnlyGuard } from './dev-only.guard';
import { DevService } from './dev.service';
import { SeedDto } from './dto/seed.dto';

@Controller('dev')
@UseGuards(JwtAuthGuard, DevOnlyGuard)
export class DevController {
  constructor(private dev: DevService) {}

  @Post('seed')
  seed(@CurrentUser() user: RequestUser, @Body() dto: SeedDto) {
    return this.dev.seed(user.id, dto.dataRoomId, dto.scale);
  }
}

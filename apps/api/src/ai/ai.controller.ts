import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { AiSettingsService } from './ai-settings.service';
import { PatchAiSettingsDto } from './dto/ai-settings.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private settings: AiSettingsService) {}

  @Get('me/ai-settings')
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settings.get(user.id);
  }

  @Patch('me/ai-settings')
  patchSettings(@CurrentUser() user: RequestUser, @Body() dto: PatchAiSettingsDto) {
    return this.settings.upsert(user.id, dto);
  }
}

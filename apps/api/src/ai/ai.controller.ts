import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { AiSettingsService } from './ai-settings.service';
import { AnalysisService } from './analysis.service';
import { PatchAiSettingsDto } from './dto/ai-settings.dto';
import { AnalyzeDto } from './dto/analyze.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private settings: AiSettingsService,
    private analysis: AnalysisService,
  ) {}

  @Get('me/ai-settings')
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settings.get(user.id);
  }

  @Patch('me/ai-settings')
  async patchSettings(@CurrentUser() user: RequestUser, @Body() dto: PatchAiSettingsDto) {
    const settings = await this.settings.upsert(user.id, dto);
    if (settings.hasKey) await this.analysis.resumeWhenKeyReady(user.id);
    return settings;
  }

  @Post('ai/analyze')
  analyze(@CurrentUser() user: RequestUser, @Body() dto: AnalyzeDto) {
    return this.analysis.enqueueFromDto(user.id, dto.resourceType, dto.resourceId, dto.kind);
  }

  @Get('ai/:resourceType/:resourceId')
  list(
    @CurrentUser() user: RequestUser,
    @Param('resourceType') resourceType: ResourceType,
    @Param('resourceId') resourceId: string,
  ) {
    return this.analysis.listForViewer(user.id, resourceType, resourceId);
  }
}

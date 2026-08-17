import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiSettingsService } from './ai-settings.service';
import { AnalysisService } from './analysis.service';
import { AnalysisWorker } from './analysis.worker';
import { LlmService } from './llm.service';

@Module({
  controllers: [AiController],
  providers: [AiSettingsService, AnalysisService, AnalysisWorker, LlmService],
  exports: [AiSettingsService, AnalysisService],
})
export class AiModule {}

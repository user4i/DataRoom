import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiSettingsService } from './ai-settings.service';
import { AnalysisService } from './analysis.service';
import { AnalysisWorker } from './analysis.worker';

@Module({
  controllers: [AiController],
  providers: [AiSettingsService, AnalysisService, AnalysisWorker],
  exports: [AiSettingsService, AnalysisService],
})
export class AiModule {}

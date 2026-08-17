import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiSettingsService } from './ai-settings.service';

@Module({
  controllers: [AiController],
  providers: [AiSettingsService],
  exports: [AiSettingsService],
})
export class AiModule {}

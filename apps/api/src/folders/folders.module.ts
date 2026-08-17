import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { AiModule } from '../ai/ai.module';
import { LabelsModule } from '../labels/labels.module';

@Module({
  imports: [AiModule, LabelsModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}

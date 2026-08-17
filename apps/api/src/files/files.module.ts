import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { AiModule } from '../ai/ai.module';
import { LabelsModule } from '../labels/labels.module';

@Module({
  imports: [AiModule, LabelsModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

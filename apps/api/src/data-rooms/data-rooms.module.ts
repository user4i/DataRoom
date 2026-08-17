import { Module } from '@nestjs/common';
import { DataRoomsController } from './data-rooms.controller';
import { DataRoomsService } from './data-rooms.service';
import { AiModule } from '../ai/ai.module';
import { DevModule } from '../dev/dev.module';
import { LabelsModule } from '../labels/labels.module';

@Module({
  imports: [AiModule, DevModule, LabelsModule],
  controllers: [DataRoomsController],
  providers: [DataRoomsService],
  exports: [DataRoomsService],
})
export class DataRoomsModule {}

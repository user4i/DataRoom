import { Module } from '@nestjs/common';
import { DataRoomsController } from './data-rooms.controller';
import { DataRoomsService } from './data-rooms.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [DataRoomsController],
  providers: [DataRoomsService],
  exports: [DataRoomsService],
})
export class DataRoomsModule {}

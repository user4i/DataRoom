import { Module } from '@nestjs/common';
import { DataRoomsModule } from '../data-rooms/data-rooms.module';
import { FoldersModule } from '../folders/folders.module';
import { FilesModule } from '../files/files.module';
import { PublicController } from './public.controller';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [DataRoomsModule, FoldersModule, FilesModule],
  controllers: [SharesController, PublicController],
  providers: [SharesService],
})
export class SharesModule {}

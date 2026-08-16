import { Controller, Get, Param } from '@nestjs/common';
import { SharesService } from './shares.service';

@Controller('public')
export class PublicController {
  constructor(private shares: SharesService) {}

  @Get(':token')
  meta(@Param('token') token: string) {
    return this.shares.publicMeta(token);
  }

  @Get(':token/folders/:folderId')
  folder(@Param('token') token: string, @Param('folderId') folderId: string) {
    return this.shares.publicFolder(token, folderId);
  }

  @Get(':token/files/:fileId')
  file(@Param('token') token: string, @Param('fileId') fileId: string) {
    return this.shares.publicFile(token, fileId);
  }
}

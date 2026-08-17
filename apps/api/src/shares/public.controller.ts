import { Controller, Get, Param, Query } from '@nestjs/common';
import { SharesService } from './shares.service';
import { parseListingPage } from '../common/listing-page';

@Controller('public')
export class PublicController {
  constructor(private shares: SharesService) {}

  @Get(':token')
  meta(
    @Param('token') token: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    const parsed = parseListingPage(page, pageSize);
    return this.shares.publicMeta(token, parsed.page, parsed.pageSize, q);
  }

  @Get(':token/folders/:folderId')
  folder(
    @Param('token') token: string,
    @Param('folderId') folderId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    const parsed = parseListingPage(page, pageSize);
    return this.shares.publicFolder(token, folderId, parsed.page, parsed.pageSize, q);
  }

  @Get(':token/files/:fileId')
  file(@Param('token') token: string, @Param('fileId') fileId: string) {
    return this.shares.publicFile(token, fileId);
  }
}

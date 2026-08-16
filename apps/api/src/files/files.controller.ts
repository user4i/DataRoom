import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { ConfirmFileDto, MoveFileDto, PresignDto, RenameFileDto } from './dto/file.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Post('files/presign')
  presign(@CurrentUser() user: RequestUser, @Body() dto: PresignDto) {
    return this.files.presign(user.id, dto);
  }

  @Post('files')
  confirm(@CurrentUser() user: RequestUser, @Body() dto: ConfirmFileDto) {
    return this.files.confirm(user.id, dto);
  }

  @Get('data-rooms/:id/search')
  search(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('q') q = '',
  ) {
    return this.files.search(user.id, id, q);
  }

  @Get('files/:id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.files.get(user.id, id);
  }

  @Get('files/:id/versions')
  versions(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.files.versions(user.id, id);
  }

  @Patch('files/:id')
  rename(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RenameFileDto,
  ) {
    return this.files.update(user.id, id, { name: dto.name });
  }

  @Post('files/:id/move')
  move(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.files.update(user.id, id, { folderId: dto.folderId });
  }

  @Delete('files/:id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.files.remove(user.id, id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { StorageService } from '../storage/storage.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(
    private folders: FoldersService,
    private storage: StorageService,
  ) {}

  @Post('data-rooms/:id/folders')
  create(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.folders.create(user.id, id, dto);
  }

  @Get('data-rooms/:id/folder-tree')
  tree(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.folders.tree(user.id, id, parentId || null);
  }

  @Get('folders/:id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.folders.get(user.id, id);
  }

  @Patch('folders/:id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.folders.update(user.id, id, dto);
  }

  @Get('folders/:id/deletion-preview')
  preview(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.folders.deletionPreview(user.id, id);
  }

  @Delete('folders/:id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.folders.remove(user.id, id);
    await Promise.all(result.storageKeys.map((key) => this.storage.deleteObject(key)));
    return { deleted: true };
  }
}

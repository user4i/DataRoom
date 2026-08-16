import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { StorageService } from '../storage/storage.service';

@Controller('data-rooms')
@UseGuards(JwtAuthGuard)
export class DataRoomsController {
  constructor(
    private rooms: DataRoomsService,
    private storage: StorageService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.rooms.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRoomDto) {
    return this.rooms.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rooms.listing(user.id, id);
  }

  @Get(':id/meta')
  meta(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rooms.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(user.id, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.rooms.remove(user.id, id);
    await Promise.all(result.storageKeys.map((key) => this.storage.deleteObject(key)));
    return { deleted: true };
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { AssignTagsDto, CreateTagDefDto, UpdateTagDefDto } from './dto/tags.dto';
import { LabelsService } from './labels.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private labels: LabelsService) {}

  @Get('me/tags')
  listCatalog(@CurrentUser() user: RequestUser) {
    return this.labels.listCatalog(user.id);
  }

  @Post('me/tags')
  createTag(@CurrentUser() user: RequestUser, @Body() dto: CreateTagDefDto) {
    return this.labels.createTag(user.id, dto);
  }

  @Patch('me/tags/:id')
  updateTag(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateTagDefDto) {
    return this.labels.updateTag(user.id, id, dto);
  }

  @Delete('me/tags/:id')
  deleteTag(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.labels.deleteTag(user.id, id);
  }

  @Put('tags')
  assign(@CurrentUser() user: RequestUser, @Body() dto: AssignTagsDto) {
    return this.labels.assign(user.id, dto);
  }
}

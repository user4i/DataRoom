import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/share.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';

@Controller('shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private shares: SharesService) {}

  @Get('inbox')
  inbox(@CurrentUser() user: RequestUser) {
    return this.shares.inbox(user.id);
  }

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('resourceType') resourceType: ResourceType,
    @Query('resourceId') resourceId: string,
  ) {
    return this.shares.list(user.id, resourceType, resourceId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateShareDto) {
    return this.shares.create(user.id, dto);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.shares.revoke(user.id, id);
  }
}

import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser, OptionalUser, RequestUser } from '../common/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller()
export class CommentsController {
  constructor(private comments: CommentsService) {}

  @Get('comments')
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @OptionalUser() user: RequestUser | null,
    @Query('resourceType') resourceType: ResourceType,
    @Query('resourceId') resourceId: string,
    @Query('token') token?: string,
  ) {
    return this.comments.list(user?.id ?? null, token, resourceType, resourceId);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCommentDto) {
    return this.comments.create(user.id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.comments.remove(user.id, id);
  }
}

import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ResourceType, ShareKind } from '@prisma/client';

export class CreateShareDto {
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @IsUUID()
  resourceId!: string;

  @IsEnum(ShareKind)
  kind!: ShareKind;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ListSharesQueryDto {
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @IsUUID()
  resourceId!: string;
}

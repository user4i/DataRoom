import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTagDefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class UpdateTagDefDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class AssignTagsDto {
  @IsIn(['FILE', 'FOLDER'])
  resourceType!: 'FILE' | 'FOLDER';

  @IsUUID()
  resourceId!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  tagIds!: string[];
}

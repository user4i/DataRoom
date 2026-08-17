import { ArrayMaxSize, IsArray, IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTagDefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}

export class UpdateTagDefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
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

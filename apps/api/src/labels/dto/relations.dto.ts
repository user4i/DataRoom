import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsUUID, ValidateNested } from 'class-validator';

export class RelatedRefDto {
  @IsIn(['FILE', 'FOLDER'])
  resourceType!: 'FILE' | 'FOLDER';

  @IsUUID()
  resourceId!: string;
}

export class AssignRelationsDto {
  @IsIn(['FILE', 'FOLDER'])
  resourceType!: 'FILE' | 'FOLDER';

  @IsUUID()
  resourceId!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RelatedRefDto)
  items!: RelatedRefDto[];
}

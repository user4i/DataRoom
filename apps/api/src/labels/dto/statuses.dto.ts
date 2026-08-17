import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateStatusDefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}

export class UpdateStatusDefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}

export class AssignStatusDto {
  @IsIn(['FILE', 'FOLDER'])
  resourceType!: 'FILE' | 'FOLDER';

  @IsUUID()
  resourceId!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  statusId!: string | null;
}

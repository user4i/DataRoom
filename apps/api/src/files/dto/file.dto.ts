import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class PresignDto {
  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  size!: number;
}

export class ConfirmFileDto {
  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size!: number;

  @IsString()
  storageKey!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsIn(['replace', 'keep_both'])
  conflict?: 'replace' | 'keep_both';
}

export class RenameFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class MoveFileDto {
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  folderId!: string | null;
}

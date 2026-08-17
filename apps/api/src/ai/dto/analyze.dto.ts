import { IsIn, IsUUID } from 'class-validator';

export class AnalyzeDto {
  @IsIn(['FILE', 'FOLDER'])
  resourceType!: 'FILE' | 'FOLDER';

  @IsUUID()
  resourceId!: string;

  @IsIn(['FILE_SUMMARY', 'FOLDER_SUMMARY', 'FOLDER_COMPARE'])
  kind!: 'FILE_SUMMARY' | 'FOLDER_SUMMARY' | 'FOLDER_COMPARE';
}

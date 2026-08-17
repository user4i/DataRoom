import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchAiSettingsDto {
  @IsOptional()
  @IsIn(['en', 'uk'])
  locale?: 'en' | 'uk';

  @IsOptional()
  @IsIn(['GEMINI', 'OPENAI_COMPATIBLE'])
  provider?: 'GEMINI' | 'OPENAI_COMPATIBLE';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}

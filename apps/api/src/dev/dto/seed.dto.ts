import { IsIn, IsUUID } from 'class-validator';

export const SEED_SCALES = ['clear', 'minimal', 'medium', 'heavy'] as const;
export type SeedScale = (typeof SEED_SCALES)[number];

export class SeedDto {
  @IsUUID()
  dataRoomId!: string;

  @IsIn(SEED_SCALES)
  scale!: SeedScale;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

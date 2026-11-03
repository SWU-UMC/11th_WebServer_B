import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateRatingDto {
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null;
}

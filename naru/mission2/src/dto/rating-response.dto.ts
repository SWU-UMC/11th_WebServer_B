import { ApiProperty } from '@nestjs/swagger';
import { Rating } from '../entity/rating.entity';

export class RatingResponseDto {
  @ApiProperty({ type: 'integer', example: 1 })
  ratingId: number;
  @ApiProperty({ type: 'integer', example: 238 })
  movieId: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5, example: 5 })
  score: number;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '다시 보고 싶은 영화입니다.',
  })
  comment: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  static from(rating: Rating): RatingResponseDto {
    const dto = new RatingResponseDto();
    dto.ratingId = rating.ratingId;
    dto.movieId = Number(rating.movieId);
    dto.score = rating.score;
    dto.comment = rating.comment;
    dto.createdAt = rating.createdAt;
    dto.updatedAt = rating.updatedAt;
    return dto;
  }
}

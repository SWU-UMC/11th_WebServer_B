import { Rating } from '../entity/rating.entity';

export class RatingResponseDto {
  ratingId: number;
  movieId: number;
  score: number;
  comment: string | null;
  createdAt: Date;
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

import { ApiProperty } from '@nestjs/swagger';
import { FavoriteResponseDto } from './favorite-response.dto';
import { RatingResponseDto } from './rating-response.dto';

export class MovieRecordResponseDto {
  @ApiProperty({ type: () => RatingResponseDto })
  rating: RatingResponseDto;
  @ApiProperty({
    type: () => FavoriteResponseDto,
    nullable: true,
    description: 'addToFavorites가 false이면 null',
  })
  favorite: FavoriteResponseDto | null;

  static of(
    rating: RatingResponseDto,
    favorite: FavoriteResponseDto | null,
  ): MovieRecordResponseDto {
    return { rating, favorite };
  }
}

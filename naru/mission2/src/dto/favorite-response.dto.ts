import { ApiProperty } from '@nestjs/swagger';
import { Favorite } from '../entity/favorite.entity';

export class FavoriteResponseDto {
  @ApiProperty({ type: 'integer', example: 1 })
  favoriteId: number;
  @ApiProperty({ type: 'integer', example: 550 })
  movieId: number;
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-18T10:00:00.000Z',
  })
  createdAt: Date;

  static from(favorite: Favorite): FavoriteResponseDto {
    return {
      favoriteId: favorite.favoriteId,
      movieId: favorite.movieId,
      createdAt: favorite.createdAt,
    };
  }
}

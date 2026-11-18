import { ApiProperty } from '@nestjs/swagger';
export class FavoriteStatusResponseDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: '미등록 영화는 false이며 오류가 아닙니다.',
  })
  isFavorite: boolean;

  static from(isFavorite: boolean): FavoriteStatusResponseDto {
    return { isFavorite };
  }
}

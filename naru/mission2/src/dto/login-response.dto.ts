import { ApiProperty } from '@nestjs/swagger';
export class LoginResponseDto {
  @ApiProperty({ example: '영화광' })
  nickname: string;
  @ApiProperty({
    description: 'Authorize에 입력할 JWT',
    example: 'eyJ...로그인으로_발급받은_토큰',
  })
  accessToken: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  @ApiProperty({ example: 'movie@example.com', format: 'email' })
  email: string;

  // 가입 당시의 비밀번호 규칙과 무관한 로그인 허용
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @ApiProperty({
    example: '가입할 때 입력한 비밀번호',
    format: 'password',
    writeOnly: true,
  })
  password: string;
}

import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ERROR_MESSAGES } from '../common/response.constants';

export class MemberUpdateRequestDto {
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
  @Length(2, 12, { message: ERROR_MESSAGES.INVALID_NICKNAME })
  nickname: string;
}

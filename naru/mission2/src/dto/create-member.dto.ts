import { ERROR_MESSAGES } from '../common/response.constants';
import {
  IsDefined,
  IsEmail,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateMemberDto {
  @IsDefined()
  @IsString()
  @IsEmail()
  email: string;

  @IsDefined()
  @IsString()
  @Length(2, 12)
  nickname: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])[\s\S]+$/, {
    message: ERROR_MESSAGES.INVALID_PASSWORD,
  })
  password: string;
}

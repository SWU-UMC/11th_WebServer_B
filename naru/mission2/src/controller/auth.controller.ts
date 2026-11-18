import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from '../dto/login-response.dto';
import {
  ApiFailureResponse,
  ApiSuccessResponse,
} from '../swagger/api-response.decorator';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SUCCESS_RESPONSES } from '../common/response.constants';
import { LoginRequestDto } from '../dto/login-request.dto';
import { AuthService } from '../service/auth.service';

@ApiTags('인증 (공개 API)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '로그인 (토큰 불필요)',
    description:
      '반환된 accessToken을 Swagger Authorize에 Bearer 접두사 없이 입력하세요.',
  })
  @ApiSuccessResponse(200, '로그인에 성공했습니다.', LoginResponseDto)
  @ApiFailureResponse(400, [
    { code: 'COMMON400', message: '이메일 형식이 올바르지 않습니다.' },
  ])
  @ApiFailureResponse(401, [
    { code: 'AUTH401_1', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
  ])
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequestDto) {
    const result = await this.authService.login(dto);
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.LOGIN,
      result,
    };
  }
}

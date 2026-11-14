import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SUCCESS_RESPONSES } from '../common/response.constants';
import { LoginRequestDto } from '../dto/login-request.dto';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

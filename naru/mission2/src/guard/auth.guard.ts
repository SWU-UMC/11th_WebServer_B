import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import { ERROR_MESSAGES } from '../common/response.constants';
import { ApiException } from '../exception/api.exception';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { memberId?: number }>();
    const header = request.headers.authorization;

    // 인증 헤더 및 Bearer 접두사 확인
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH401_2',
        ERROR_MESSAGES.LOGIN_REQUIRED,
      );
    }

    const token = header.slice(BEARER_PREFIX.length);
    try {
      // 토큰 서명 및 만료 시각 검증
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const memberId = Number(payload.sub);
      if (!Number.isSafeInteger(memberId) || memberId <= 0) {
        throw new Error('유효하지 않은 회원 번호');
      }

      // 후속 컨트롤러에서 사용할 로그인 회원 번호 저장
      request.memberId = memberId;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          'AUTH401_4',
          ERROR_MESSAGES.TOKEN_EXPIRED,
        );
      }
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH401_3',
        ERROR_MESSAGES.INVALID_TOKEN,
      );
    }

    return true;
  }
}

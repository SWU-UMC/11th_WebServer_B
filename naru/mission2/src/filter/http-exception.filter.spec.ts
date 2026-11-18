import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { ApiException } from '../exception/api.exception';
import { MemberConflictException } from '../exception/member-conflict.exception';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it.each([
    {
      exception: new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH401_2',
        '로그인이 필요한 요청입니다.',
      ),
      status: 401,
      code: 'AUTH401_2',
      message: '로그인이 필요한 요청입니다.',
    },
    {
      exception: new MemberConflictException('email'),
      status: 409,
      code: 'MEMBER4091',
      message: '이미 사용 중인 이메일입니다.',
    },
    {
      exception: new BadRequestException(['이메일 오류', '닉네임 오류']),
      status: 400,
      code: 'COMMON400',
      message: '이메일 오류; 닉네임 오류',
    },
    {
      exception: new InternalServerErrorException('private database details'),
      status: 500,
      code: 'COMMON500',
      message: '서버 오류가 발생했습니다.',
    },
    {
      exception: new ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'AUTH500_1',
        'private signing details',
      ),
      status: 500,
      code: 'AUTH500_1',
      message: '서버 오류가 발생했습니다.',
    },
    {
      exception: new Error('private database details'),
      status: 500,
      code: 'COMMON500',
      message: '서버 오류가 발생했습니다.',
    },
  ])('responds with $status / $code', ({ exception, status, code, message }) => {
    const response = {
      status: jest.fn<(status: number) => unknown>(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({
      isSuccess: false,
      code,
      message,
      result: null,
    });
  });
});

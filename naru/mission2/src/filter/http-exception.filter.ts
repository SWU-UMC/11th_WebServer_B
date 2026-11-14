import {
  ERROR_MESSAGES,
  commonResponseCode,
} from '../common/response.constants';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MemberConflictException } from '../exception/member-conflict.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if ('message' in body) {
        const detail: unknown = body.message;
        if (typeof detail === 'string') message = detail;
        else if (Array.isArray(detail)) {
          message = detail
            .filter((item) => typeof item === 'string')
            .join('; ');
        } else message = exception.message;
      } else message = exception.message;
    }

    response.status(status).json({
      isSuccess: false,
      code:
        exception instanceof MemberConflictException
          ? exception.code
          : commonResponseCode(status),
      message,
      result: null,
    });
  }
}

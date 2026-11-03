import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '서버 오류가 발생했습니다.';

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
      code: `COMMON${status}`,
      message,
      result: null,
    });
  }
}

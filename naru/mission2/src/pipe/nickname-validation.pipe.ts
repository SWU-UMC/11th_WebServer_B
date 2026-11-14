import { ERROR_MESSAGES } from '../common/response.constants';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class NicknameValidationPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_NICKNAME);
    }

    const length = Array.from(value).length;
    if (length < 2 || length > 12) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_NICKNAME);
    }

    return value;
  }
}

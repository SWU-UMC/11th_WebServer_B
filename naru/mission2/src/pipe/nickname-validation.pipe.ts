import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class NicknameValidationPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        'Nickname must be between 2 and 12 characters',
      );
    }

    const length = Array.from(value).length;
    if (length < 2 || length > 12) {
      throw new BadRequestException(
        'Nickname must be between 2 and 12 characters',
      );
    }

    return value;
  }
}

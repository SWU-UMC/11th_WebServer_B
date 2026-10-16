import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class EmailValidationPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || value.length > 254) {
      throw new BadRequestException('Email must be a valid email address');
    }

    const parts = value.split('@');
    const [local, domain] = parts;
    const atom = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+$/;
    const domainLabel = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    if (
      parts.length !== 2 ||
      !local ||
      local.length > 64 ||
      !local.split('.').every((part) => atom.test(part)) ||
      !domain ||
      domain.split('.').length < 2 ||
      !domain.split('.').every((label) => domainLabel.test(label)) ||
      !/^[a-zA-Z]{2,}$/.test(domain.split('.').at(-1) ?? '')
    ) {
      throw new BadRequestException('Email must be a valid email address');
    }

    return value;
  }
}

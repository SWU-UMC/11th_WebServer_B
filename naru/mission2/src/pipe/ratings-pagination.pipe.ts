import { BadRequestException, PipeTransform } from '@nestjs/common';

export interface RatingsPagination {
  page: number;
  size: number;
}

export class RatingsPaginationPipe implements PipeTransform<
  Record<string, unknown>,
  RatingsPagination
> {
  transform(query: Record<string, unknown>): RatingsPagination {
    const page = this.parse(query.page, 0, 0, 'page');
    const size = this.parse(query.size, 10, 1, 'size');

    if (!Number.isSafeInteger(page * size)) {
      throw new BadRequestException('Pagination offset is too large');
    }

    return { page, size };
  }

  private parse(
    value: unknown,
    defaultValue: number,
    minimum: number,
    name: string,
  ): number {
    if (value === undefined) return defaultValue;

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      throw new BadRequestException(`${name} must be an integer >= ${minimum}`);
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum) {
      throw new BadRequestException(`${name} must be an integer >= ${minimum}`);
    }

    return parsed;
  }
}

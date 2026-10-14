import { BadRequestException } from '@nestjs/common';
import { RatingsPaginationPipe } from './ratings-pagination.pipe';

describe('RatingsPaginationPipe', () => {
  const pipe = new RatingsPaginationPipe();

  it.each([
    [{}, { page: 0, size: 10 }],
    [{ page: '1' }, { page: 1, size: 10 }],
    [{ size: '1' }, { page: 0, size: 1 }],
    [
      { page: '2', size: '1' },
      { page: 2, size: 1 },
    ],
  ])('converts %j into %j', (query, expected) => {
    expect(pipe.transform(query)).toEqual(expected);
  });

  it.each([
    { page: '-1' },
    { size: '0' },
    { size: '-1' },
    { page: 'abc' },
    { page: '1.5' },
    { size: '1.5' },
    { page: '' },
    { size: '' },
    { size: 'Infinity' },
    { page: ['0', '1'] },
    { size: { value: '1' } },
    { page: '9007199254740992' },
    { page: '9007199254740991', size: '2' },
  ])('rejects invalid pagination %j', (query) => {
    expect(() => pipe.transform(query)).toThrow(BadRequestException);
  });
});

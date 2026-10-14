import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Rating } from '../entity/rating.entity';
import { RatingResponseDto } from '../dto/rating-response.dto';
import { MemberService } from './member.service';
import { RatingService } from './rating.service';

describe('RatingService pagination', () => {
  const repository = { find: jest.fn<Repository<Rating>['find']>() };
  const members = { existsById: jest.fn<MemberService['existsById']>() };
  const service = new RatingService(
    repository as unknown as Repository<Rating>,
    members as unknown as MemberService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    members.existsById.mockResolvedValue(true);
    repository.find.mockResolvedValue([]);
  });

  it.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 10],
  ])('queries page %i with size %i at the repository', async (page, size) => {
    await expect(service.getRatingsByMemberId(1, page, size)).resolves.toEqual(
      [],
    );
    expect(members.existsById).toHaveBeenCalledWith(1);
    expect(repository.find).toHaveBeenCalledWith({
      where: { member: { memberId: 1 } },
      order: { ratingId: 'DESC' },
      skip: page * size,
      take: size,
    });
  });

  it('defaults to the first ten ratings and maps entities to DTOs', async () => {
    const rating = Object.assign(new Rating(), {
      ratingId: 2,
      movieId: 155,
      score: 4,
      comment: null,
      createdAt: new Date('2026-10-14'),
      updatedAt: new Date('2026-10-14'),
    });
    repository.find.mockResolvedValue([rating]);
    const result = await service.getRatingsByMemberId(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
    expect(result).toEqual([RatingResponseDto.from(rating)]);
    expect(result[0]).toBeInstanceOf(RatingResponseDto);
  });

  it('returns 404 before querying ratings for an unknown member', async () => {
    members.existsById.mockResolvedValue(false);
    await expect(
      service.getRatingsByMemberId(999999, 0, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.find).not.toHaveBeenCalled();
  });
});

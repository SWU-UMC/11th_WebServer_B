import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';
import { setupApp } from '../app.setup';
import { Rating } from '../entity/rating.entity';
import { MemberService } from '../service/member.service';
import { RatingService } from '../service/rating.service';
import { MemberController } from './member.controller';
import { RatingController } from './rating.controller';

describe('Rating mutations HTTP', () => {
  let app: INestApplication;
  let rows: Rating[];
  let nextId: number;
  const input = { movieId: 155, score: 4, comment: '좋아요' };
  const members = { existsById: jest.fn<MemberService['existsById']>() };
  type Where = { member: { memberId: number }; movieId: number };
  const repository = {
    existsBy: jest.fn<(where: Where) => Promise<boolean>>(),
    create: jest.fn<(data: Partial<Rating>) => Rating>(),
    save: jest.fn<(rating: Rating) => Promise<Rating>>(),
    remove: jest.fn<(rating: Rating) => Promise<Rating>>(),
    findOne:
      jest.fn<
        (options: {
          where: { ratingId: number };
          relations: { member: boolean };
        }) => Promise<Rating | null>
      >(),
    find: jest.fn<
      (options: {
        where: { member: { memberId: number } };
        skip: number;
        take: number;
      }) => Promise<Rating[]>
    >(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RatingController, MemberController],
      providers: [
        RatingService,
        { provide: MemberService, useValue: members },
        { provide: getRepositoryToken(Rating), useValue: repository },
      ],
    }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    rows = [];
    nextId = 1;
    members.existsById.mockImplementation(async (id) => id === 1 || id === 2);
    repository.existsBy.mockImplementation(async (where) =>
      rows.some(
        (row) =>
          row.member.memberId === where.member.memberId &&
          row.movieId === where.movieId,
      ),
    );
    repository.create.mockImplementation((data) =>
      Object.assign(new Rating(), data),
    );
    repository.save.mockImplementation(async (rating) => {
      if (!rating.ratingId) {
        rating.ratingId = nextId++;
        rating.createdAt = new Date();
        rows.push(rating);
      }
      rating.updatedAt = new Date();
      return rating;
    });
    repository.findOne.mockImplementation(
      async ({ where }) =>
        rows.find((r) => r.ratingId === where.ratingId) ?? null,
    );
    repository.remove.mockImplementation(async (rating) => {
      rows = rows.filter((row) => row.ratingId !== rating.ratingId);
      return rating;
    });
    repository.find.mockImplementation(async ({ where, skip, take }) =>
      rows
        .filter((r) => r.member.memberId === where.member.memberId)
        .sort((a, b) => b.ratingId - a.ratingId)
        .slice(skip, skip + take),
    );
  });
  const create = () =>
    request(app.getHttpServer())
      .post('/members/1/ratings')
      .send(input)
      .expect(201);

  it('creates a rating with the exact 201 response', async () => {
    const response = await create();
    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON201',
      message: '평점 등록에 성공했습니다.',
      result: 1,
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(rows[0]).toMatchObject({ ...input, member: { memberId: 1 } });
  });
  it('returns 409 for duplicate movie and member, allowing a different member', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .post('/members/1/ratings')
      .send(input)
      .expect(409);
    expect(response.body.code).toBe('COMMON409');
    expect(repository.save).toHaveBeenCalledTimes(1);
    await request(app.getHttpServer())
      .post('/members/2/ratings')
      .send(input)
      .expect(201);
  });
  it('returns 404 before rating lookup for an unknown member', async () => {
    await request(app.getHttpServer())
      .post('/members/999/ratings')
      .send(input)
      .expect(404);
    expect(repository.existsBy).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, score: 0 },
    { ...input, score: 6 },
    { ...input, score: 1.5 },
    { ...input, score: '4' },
    { movieId: 155 },
    { ...input, movieId: 0 },
    { ...input, movieId: -1 },
    { ...input, movieId: 1.5 },
    { ...input, movieId: '155' },
    { score: 4 },
    { ...input, comment: 'a'.repeat(501) },
    { ...input, comment: 123 },
    { ...input, unexpected: true },
  ])('rejects invalid create DTO %j', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/members/1/ratings')
      .send(body)
      .expect(400);
    expect(response.body).toMatchObject({
      isSuccess: false,
      code: 'COMMON400',
      result: null,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each([undefined, null, '', 'a'.repeat(500)])(
    'accepts optional comment %s',
    async (comment) => {
      await request(app.getHttpServer())
        .post('/members/1/ratings')
        .send({ ...input, comment })
        .expect(201);
      expect(rows[0].comment).toBe(comment ?? null);
    },
  );
  it('handles a duplicate inserted concurrently as 409', async () => {
    repository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }),
      ),
    );
    await request(app.getHttpServer())
      .post('/members/1/ratings')
      .send(input)
      .expect(409);
  });
  it('updates a rating and exposes the change through the existing GET', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .patch('/members/1/ratings/1')
      .send({ score: 5, comment: '수정' })
      .expect(200);
    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON200',
      message: '평점 수정에 성공했습니다.',
      result: 1,
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { ratingId: 1 },
      relations: { member: true },
    });
    const list = await request(app.getHttpServer())
      .get('/members/1/ratings?page=0&size=1')
      .expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        ratingId: 1,
        movieId: 155,
        score: 5,
        comment: '수정',
      }),
    ]);
  });
  it('preserves comment on omission and clears it on explicit null', async () => {
    await create();
    await request(app.getHttpServer())
      .patch('/members/1/ratings/1')
      .send({ score: 1 })
      .expect(200);
    expect(rows[0].comment).toBe(input.comment);
    await request(app.getHttpServer())
      .patch('/members/1/ratings/1')
      .send({ score: 2, comment: null })
      .expect(200);
    expect(rows[0].comment).toBeNull();
  });
  it.each([
    { score: 0 },
    { score: 6 },
    { score: 2.5 },
    {},
    { score: 4, comment: 'a'.repeat(501) },
    { score: 4, movieId: 1 },
  ])('rejects invalid update DTO %j', async (body) => {
    await create();
    await request(app.getHttpServer())
      .patch('/members/1/ratings/1')
      .send(body)
      .expect(400);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
  it.each(['patch', 'delete'] as const)(
    'returns 403 for another member on %s',
    async (method) => {
      await create();
      const response = await request(app.getHttpServer())
        [method]('/members/2/ratings/1')
        .send(method === 'patch' ? { score: 5 } : undefined)
        .expect(403);
      expect(response.body.code).toBe('COMMON403');
      expect(rows[0].score).toBe(4);
      expect(repository.remove).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledTimes(1);
    },
  );
  it.each(['patch', 'delete'] as const)(
    'returns 404 for missing rating on %s',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/members/1/ratings/999')
        .send(method === 'patch' ? { score: 5 } : undefined)
        .expect(404);
      expect(repository.remove).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('deletes with an empty 204 response and excludes the rating from GET', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .delete('/members/1/ratings/1')
      .expect(204);
    expect(response.text).toBe('');
    const list = await request(app.getHttpServer())
      .get('/members/1/ratings')
      .expect(200);
    expect(list.body).toEqual([]);
  });
  it.each([
    ['post', '/members/abc/ratings'],
    ['patch', '/members/abc/ratings/1'],
    ['patch', '/members/1/ratings/abc'],
    ['delete', '/members/abc/ratings/1'],
    ['delete', '/members/1/ratings/abc'],
  ] as const)('validates path integers on %s %s', async (method, url) => {
    await request(app.getHttpServer())
      [method](url)
      .send(
        method === 'post'
          ? input
          : method === 'patch'
            ? { score: 4 }
            : undefined,
      )
      .expect(400);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});

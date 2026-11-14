import { JwtModule, JwtService } from '@nestjs/jwt';
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
  let jwtService: JwtService;
  let tokenA: string;
  let tokenB: string;
  let unknownToken: string;
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
      imports: [
        JwtModule.register({
          secret: 'test-only-member-secret-at-least-32-characters',
        }),
      ],
      controllers: [RatingController, MemberController],
      providers: [
        RatingService,
        { provide: MemberService, useValue: members },
        { provide: getRepositoryToken(Rating), useValue: repository },
      ],
    }).compile();
    jwtService = module.get(JwtService);
    tokenA = await jwtService.signAsync({ sub: '1' });
    tokenB = await jwtService.signAsync({ sub: '2' });
    unknownToken = await jwtService.signAsync({ sub: '999' });
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
      .post('/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(input)
      .expect(201);

  it('creates a rating with the exact 201 response', async () => {
    const response = await create();
    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON201',
      message: '평점 등록에 성공했습니다.',
      result: {
        ratingId: 1,
        movieId: 155,
        score: 4,
        comment: '좋아요',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(rows[0]).toMatchObject({ ...input, member: { memberId: 1 } });
  });
  it('returns 409 for duplicate movie and member, allowing a different member', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(input)
      .expect(409);
    expect(response.body.code).toBe('RATING409_1');
    expect(repository.save).toHaveBeenCalledTimes(1);
    await request(app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(input)
      .expect(201);
  });
  it('returns 404 before rating lookup for an unknown member', async () => {
    await request(app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${unknownToken}`)
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
    { ...input, memberId: 2 },
  ])('rejects invalid create DTO %j', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
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
        .post('/ratings')
        .set('Authorization', `Bearer ${tokenA}`)
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
      .post('/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(input)
      .expect(409);
  });
  it('updates a rating and exposes the change through the existing GET', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .patch('/ratings/1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ score: 5, comment: '수정' })
      .expect(200);
    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON200',
      message: '평점 수정에 성공했습니다.',
      result: {
        ratingId: 1,
        movieId: 155,
        score: 5,
        comment: '수정',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
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
      .patch('/ratings/1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ score: 1 })
      .expect(200);
    expect(rows[0].comment).toBe(input.comment);
    await request(app.getHttpServer())
      .patch('/ratings/1')
      .set('Authorization', `Bearer ${tokenA}`)
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
    { score: 4, memberId: 2 },
  ])('rejects invalid update DTO %j', async (body) => {
    await create();
    await request(app.getHttpServer())
      .patch('/ratings/1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(body)
      .expect(400);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
  it.each(['patch', 'delete'] as const)(
    'returns 403 for another member on %s',
    async (method) => {
      await create();
      const response = await request(app.getHttpServer())
        [method]('/ratings/1')
        .set('Authorization', `Bearer ${tokenB}`)
        .send(method === 'patch' ? { score: 5 } : undefined)
        .expect(403);
      expect(response.body.code).toBe('RATING403_1');
      expect(rows[0].score).toBe(4);
      expect(repository.remove).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledTimes(1);
    },
  );
  it.each(['patch', 'delete'] as const)(
    'returns 404 for missing rating on %s',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/ratings/999')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(method === 'patch' ? { score: 5 } : undefined)
        .expect(404);
      expect(repository.remove).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('deletes with a common 200 response and excludes the rating from GET', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .delete('/ratings/1')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON200',
      message: '평점을 삭제했습니다.',
      result: null,
    });
    const list = await request(app.getHttpServer())
      .get('/members/1/ratings')
      .expect(200);
    expect(list.body).toEqual([]);
  });
  it.each([
    ['patch', '/ratings/abc'],
    ['delete', '/ratings/abc'],
  ] as const)('validates path integers on %s %s', async (method, url) => {
    await request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${tokenA}`)
      .send(method === 'patch' ? { score: 4 } : undefined)
      .expect(400);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each(['post', 'patch', 'delete'] as const)(
    'rejects unauthenticated %s requests before database access',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method](method === 'post' ? '/ratings' : '/ratings/1')
        .send(
          method === 'post'
            ? input
            : method === 'patch'
              ? { score: 5 }
              : undefined,
        )
        .expect(401);
      expect(response.body.code).toBe('AUTH401_2');
      expect(repository.existsBy).not.toHaveBeenCalled();
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );

  it.each(['post', 'patch', 'delete'] as const)(
    'rejects a tampered token on %s',
    async (method) => {
      const [header, , signature] = tokenA.split('.');
      const payload = Buffer.from(JSON.stringify({ sub: '2' })).toString(
        'base64url',
      );
      const response = await request(app.getHttpServer())
        [method](method === 'post' ? '/ratings' : '/ratings/1')
        .set('Authorization', `Bearer ${header}.${payload}.${signature}`)
        .send(
          method === 'post'
            ? input
            : method === 'patch'
              ? { score: 5 }
              : undefined,
        )
        .expect(401);
      expect(response.body.code).toBe('AUTH401_3');
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );

  it.each(['post', 'patch', 'delete'] as const)(
    'removes the old member ID write route for %s',
    async (method) => {
      await request(app.getHttpServer())
        [method](
          method === 'post' ? '/members/1/ratings' : '/members/1/ratings/1',
        )
        .set('Authorization', `Bearer ${tokenA}`)
        .send(
          method === 'post'
            ? input
            : method === 'patch'
              ? { score: 5 }
              : undefined,
        )
        .expect(404);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );
});

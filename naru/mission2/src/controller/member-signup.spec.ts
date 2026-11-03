import {
  ForbiddenException,
  INestApplication,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';
import { Member } from '../entity/member.entity';
import { MemberService } from '../service/member.service';
import { RatingService } from '../service/rating.service';
import { MemberController } from './member.controller';
import { setupApp } from '../app.setup';

describe('POST /members', () => {
  let app: INestApplication;
  const input = {
    email: 'umc@example.com',
    nickname: 'moviefan',
    password: 'Password1!',
  };
  const repository = {
    existsBy: jest.fn<(where: object) => Promise<boolean>>(),
    create: jest.fn<(data: Partial<Member>) => Member>(),
    save: jest.fn<(member: Member) => Promise<Member>>(),
    metadata: {
      uniques: [
        { name: 'UQ_email_generated', columns: [{ propertyName: 'email' }] },
        {
          name: 'UQ_nickname_generated',
          columns: [{ propertyName: 'nickname' }],
        },
      ],
    },
  };
  const ratings = {
    getRatingsByMemberId: jest.fn<RatingService['getRatingsByMemberId']>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        MemberService,
        { provide: getRepositoryToken(Member), useValue: repository },
        { provide: RatingService, useValue: ratings },
      ],
    }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.existsBy.mockResolvedValue(false);
    ratings.getRatingsByMemberId.mockResolvedValue([]);
    repository.create.mockImplementation((data) =>
      Object.assign(new Member(), data),
    );
    repository.save.mockImplementation(async (member) =>
      Object.assign(member, { memberId: 1 }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with the exact public response and saves a bcrypt hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(input)
      .expect(201);

    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON201',
      message: '회원가입에 성공했습니다.',
      result: { memberId: 1, email: input.email, nickname: input.nickname },
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body.result).not.toHaveProperty('password');
    expect(repository.existsBy.mock.calls).toEqual([
      [{ email: input.email }],
      [{ nickname: input.nickname }],
    ]);
    const saved = repository.save.mock.calls[0][0];
    expect(saved.password).not.toBe(input.password);
    expect(saved.password).toHaveLength(60);
    expect(await bcrypt.compare(input.password, saved.password)).toBe(true);
    expect(bcrypt.getRounds(saved.password)).toBe(10);
    expect(repository.create.mock.calls[0][0]).toEqual({
      email: input.email,
      nickname: input.nickname,
      password: saved.password,
    });
    expect(repository.existsBy.mock.invocationCallOrder[1]).toBeLessThan(
      repository.create.mock.invocationCallOrder[0],
    );
  });

  it('returns 409 for duplicate email before checking nickname or saving', async () => {
    repository.existsBy.mockResolvedValueOnce(true);
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(input)
      .expect(409);
    expect(response.body.message).toBe('이미 사용 중인 이메일입니다.');
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'MEMBER4091',
      message: '이미 사용 중인 이메일입니다.',
      result: null,
    });
    expect(repository.existsBy.mock.calls).toEqual([[{ email: input.email }]]);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns 409 for duplicate nickname after checking email', async () => {
    repository.existsBy
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(input)
      .expect(409);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'MEMBER4092',
      message: '이미 사용 중인 닉네임입니다.',
      result: null,
    });
    expect(repository.existsBy.mock.calls).toEqual([
      [{ email: input.email }],
      [{ nickname: input.nickname }],
    ]);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { ...input, email: 'invalid' },
    { ...input, nickname: 'a' },
    { ...input, password: 'password' },
  ])('rejects invalid input before DB lookup: %j', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(body)
      .expect(400);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON400',
      message: expect.any(String),
      result: null,
    });
    for (const field of ['email', 'nickname', 'password'] as const) {
      if (!(field in body) || body[field] !== input[field]) {
        expect(response.body.message).toContain(
          field === 'password' ? '비밀번호' : field,
        );
      }
    }
    expect(repository.existsBy).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns 409 when a concurrent signup hits a UNIQUE constraint', async () => {
    repository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT INTO member',
        [],
        Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }),
      ),
    );
    await request(app.getHttpServer()).post('/members').send(input).expect(409);
  });

  it.each([
    ['email', 'MEMBER4091', '이미 사용 중인 이메일입니다.'],
    ['member.nickname', 'MEMBER4092', '이미 사용 중인 닉네임입니다.'],
    ['UQ_email_generated', 'MEMBER4091', '이미 사용 중인 이메일입니다.'],
    [
      'member.UQ_nickname_generated',
      'MEMBER4092',
      '이미 사용 중인 닉네임입니다.',
    ],
    [
      'unknown_email_index',
      'COMMON409',
      '이미 사용 중인 이메일 또는 닉네임입니다.',
    ],
    ['PRIMARY', 'COMMON409', '이미 사용 중인 이메일 또는 닉네임입니다.'],
  ])(
    'maps DB UNIQUE key %s without exposing the duplicate value',
    async (key, code, message) => {
      repository.save.mockRejectedValueOnce(
        new QueryFailedError(
          'INSERT secret SQL',
          ['secret password'],
          Object.assign(new Error('DB failure'), {
            code: 'ER_DUP_ENTRY',
            errno: 1062,
            sqlMessage: `Duplicate entry 'secret email nickname' for key '${key}'`,
          }),
        ),
      );
      const response = await request(app.getHttpServer())
        .post('/members')
        .send(input)
        .expect(409);
      expect(response.body).toEqual({
        isSuccess: false,
        code,
        message,
        result: null,
      });
      expect(repository.existsBy).toHaveBeenCalledTimes(2);
      expect(repository.save).toHaveBeenCalledTimes(1);
    },
  );

  it('recognizes errno 1062 and falls back to the driver message', async () => {
    repository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(
          new Error("Duplicate entry 'private' for key 'member.email'"),
          { errno: 1062 },
        ),
      ),
    );
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(input)
      .expect(409);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'MEMBER4091',
      message: '이미 사용 중인 이메일입니다.',
      result: null,
    });
  });

  it('returns a generic conflict when the duplicate key cannot be identified', async () => {
    repository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('private duplicate details'), {
          code: 'ER_DUP_ENTRY',
        }),
      ),
    );
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(input)
      .expect(409);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON409',
      message: '이미 사용 중인 이메일 또는 닉네임입니다.',
      result: null,
    });
  });

  it.each([
    { code: 'ER_NO_REFERENCED_ROW_2', errno: 1452 },
    { code: 'ER_BAD_NULL_ERROR', errno: 1048 },
    { code: 'ER_LOCK_DEADLOCK', errno: 1213 },
    { code: 'ER_PARSE_ERROR', errno: 1064 },
    {},
  ])('does not misclassify non-duplicate DB error %j', async (details) => {
    repository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT secret',
        ['private'],
        Object.assign(
          new Error("private DB error for key 'member.email'"),
          details,
        ),
      ),
    );
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(input)
      .expect(500);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON500',
      message: '서버 오류가 발생했습니다.',
      result: null,
    });
  });

  it('rejects undeclared DTO fields instead of silently removing them', async () => {
    const response = await request(app.getHttpServer())
      .post('/members')
      .send({ ...input, memberId: 999, extra: 'invalid' })
      .expect(400);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON400',
      result: null,
      message: expect.stringContaining('property memberId should not exist'),
    });
    expect(response.body.message).toContain('property extra should not exist');
    expect(repository.existsBy).not.toHaveBeenCalled();
  });

  it.each([
    ['/members/email/umc@example.com'],
    ['/members/email?email=umc@example.com'],
    ['/members/nickname/moviefan'],
    ['/members/nickname?nickname=moviefan'],
  ])('preserves availability lookup %s', async (url) => {
    const response = await request(app.getHttpServer()).get(url).expect(200);
    expect(response.body).toEqual({ available: true });
    expect(repository.existsBy).toHaveBeenCalledTimes(1);
  });

  it('preserves pagination and rating response', async () => {
    const response = await request(app.getHttpServer())
      .get('/members/1/ratings?page=2&size=3')
      .expect(200);
    expect(response.body).toEqual([]);
    expect(ratings.getRatingsByMemberId).toHaveBeenCalledWith(1, 2, 3);
  });

  it('preserves invalid pagination as 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/members/1/ratings?page=-1')
      .expect(400);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON400',
      message: expect.stringContaining('page'),
      result: null,
    });
    expect(ratings.getRatingsByMemberId).not.toHaveBeenCalled();
  });

  it.each([
    [new NotFoundException('회원이 없습니다.'), 404, '회원이 없습니다.'],
    [
      new ForbiddenException('접근 권한이 없습니다.'),
      403,
      '접근 권한이 없습니다.',
    ],
    [
      new Error('secret SQL connection password'),
      500,
      '서버 오류가 발생했습니다.',
    ],
    [
      new InternalServerErrorException('secret database details'),
      500,
      '서버 오류가 발생했습니다.',
    ],
  ])(
    'normalizes errors while preserving status %s',
    async (error, status, message) => {
      ratings.getRatingsByMemberId.mockRejectedValueOnce(error);
      const response = await request(app.getHttpServer())
        .get('/members/1/ratings')
        .expect(status as number);
      expect(response.body).toEqual({
        isSuccess: false,
        code: `COMMON${status}`,
        message,
        result: null,
      });
    },
  );

  it('normalizes unknown routes as 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/unknown')
      .expect(404);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON404',
      message: expect.any(String),
      result: null,
    });
  });

  it('preserves CORS preflight', async () => {
    const response = await request(app.getHttpServer())
      .options('/members')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,PATCH,DELETE',
    );
    expect(response.headers['access-control-allow-headers']).toBe('*');
  });
});

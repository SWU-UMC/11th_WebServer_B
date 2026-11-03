import { INestApplication } from '@nestjs/common';
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
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        MemberService,
        { provide: getRepositoryToken(Member), useValue: repository },
        { provide: RatingService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.existsBy.mockResolvedValue(false);
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
      .send({ ...input, memberId: 999, extra: 'ignored' })
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
    expect(response.body.message).toBe('이미 사용 중인 닉네임입니다.');
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
    await request(app.getHttpServer()).post('/members').send(body).expect(400);
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
});

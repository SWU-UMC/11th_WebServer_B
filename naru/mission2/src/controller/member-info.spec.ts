import { Not, QueryFailedError } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import request from 'supertest';
import { setupApp } from '../app.setup';
import { Member } from '../entity/member.entity';
import { MemberService } from '../service/member.service';
import { RatingService } from '../service/rating.service';
import { MemberController } from './member.controller';

describe('GET/PATCH /members/me', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const member = Object.assign(new Member(), {
    memberId: 7,
    email: 'movie@umc.com',
    nickname: '영화광',
    password: 'private-password-hash',
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-02T00:00:00.000Z'),
  });
  const repository = {
    findOne: jest.fn<(where: object) => Promise<Member | null>>(),
    save: jest.fn<(member: Member) => Promise<Member>>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-only-member-info-secret-at-least-32-characters',
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [MemberController],
      providers: [
        MemberService,
        { provide: getRepositoryToken(Member), useValue: repository },
        { provide: RatingService, useValue: {} },
      ],
    }).compile();
    jwtService = module.get(JwtService);
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });

  beforeEach(() => {
    member.nickname = '영화광';
    repository.save.mockReset();
    repository.save.mockImplementation(async (value) => value);
    repository.findOne.mockReset();
    repository.findOne.mockResolvedValue(member);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns only the authenticated member information', async () => {
    const token = await jwtService.signAsync({
      sub: '7',
      email: 'old@umc.com',
    });
    const response = await request(app.getHttpServer())
      .get('/members/me?memberId=99')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(repository.findOne).toHaveBeenCalledWith({ where: { memberId: 7 } });
    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON200',
      message: '회원 정보를 조회했습니다.',
      result: {
        email: member.email,
        nickname: member.nickname,
        createdAt: member.createdAt.toISOString(),
      },
    });
  });

  it('rejects requests without a token before looking up a member', async () => {
    const response = await request(app.getHttpServer())
      .get('/members/me')
      .expect(401);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'AUTH401_2',
      message: '로그인이 필요한 요청입니다.',
      result: null,
    });
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a modified token before looking up a member', async () => {
    const token = await jwtService.signAsync({ sub: '7' });
    const [header, , signature] = token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: '99' })).toString(
      'base64url',
    );
    const response = await request(app.getHttpServer())
      .get('/members/me')
      .set('Authorization', `Bearer ${header}.${payload}.${signature}`)
      .expect(401);
    expect(response.body.code).toBe('AUTH401_3');
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('rejects an expired token before looking up a member', async () => {
    const token = await jwtService.signAsync({ sub: '7' }, { expiresIn: -1 });
    const response = await request(app.getHttpServer())
      .get('/members/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body.code).toBe('AUTH401_4');
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the token owner no longer exists', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    const token = await jwtService.signAsync({ sub: '7' });
    const response = await request(app.getHttpServer())
      .get('/members/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'MEMBER404_1',
      message: '회원을 찾을 수 없습니다.',
      result: null,
    });
  });
  describe('nickname update', () => {
    beforeEach(() => {
      repository.findOne.mockReset();
      repository.findOne.mockResolvedValueOnce(member).mockResolvedValue(null);
    });

    it.each(['새닉네임', '영화광', 'ab', 'a'.repeat(12)])(
      'updates only the token owner nickname %s',
      async (nickname) => {
        const token = await jwtService.signAsync({ sub: '7' });
        const response = await request(app.getHttpServer())
          .patch('/members/me?memberId=99')
          .set('Authorization', `Bearer ${token}`)
          .send({ nickname })
          .expect(200);
        expect(repository.findOne).toHaveBeenNthCalledWith(1, {
          where: { memberId: 7 },
        });
        expect(repository.findOne).toHaveBeenNthCalledWith(2, {
          where: { nickname, memberId: Not(7) },
        });
        expect(repository.save).toHaveBeenCalledWith(member);
        expect(response.body).toEqual({
          isSuccess: true,
          code: 'COMMON200',
          message: '회원 정보를 수정했습니다.',
          result: {
            email: member.email,
            nickname,
            createdAt: member.createdAt.toISOString(),
          },
        });
      },
    );

    it.each([
      {},
      { nickname: '' },
      { nickname: 'a' },
      { nickname: 'a'.repeat(13) },
      { nickname: 123 },
      { nickname: null },
      { nickname: '새닉네임', memberId: 99 },
      { nickname: '새닉네임', email: 'other@umc.com' },
    ])('rejects invalid or extra input %j', async (body) => {
      const token = await jwtService.signAsync({ sub: '7' });
      const response = await request(app.getHttpServer())
        .patch('/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(400);
      expect(response.body.code).toBe('COMMON400');
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated update', async () => {
      const response = await request(app.getHttpServer())
        .patch('/members/me')
        .send({ nickname: '새닉네임' })
        .expect(401);
      expect(response.body.code).toBe('AUTH401_2');
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('returns 404 for a missing token owner', async () => {
      repository.findOne.mockReset();
      repository.findOne.mockResolvedValue(null);
      const token = await jwtService.signAsync({ sub: '7' });
      const response = await request(app.getHttpServer())
        .patch('/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '새닉네임' })
        .expect(404);
      expect(response.body.code).toBe('MEMBER404_1');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('returns 409 when another member uses the nickname', async () => {
      repository.findOne.mockReset();
      repository.findOne
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(
          Object.assign(new Member(), { memberId: 8, nickname: '다른회원' }),
        );
      const token = await jwtService.signAsync({ sub: '7' });
      const response = await request(app.getHttpServer())
        .patch('/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '다른회원' })
        .expect(409);
      expect(response.body).toEqual({
        isSuccess: false,
        code: 'MEMBER409_1',
        message: '이미 사용 중인 닉네임입니다.',
        result: null,
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('normalizes a concurrent duplicate save as 409', async () => {
      repository.save.mockRejectedValueOnce(
        new QueryFailedError(
          'UPDATE member',
          [],
          Object.assign(new Error('private SQL details'), {
            code: 'ER_DUP_ENTRY',
            errno: 1062,
          }),
        ),
      );
      const token = await jwtService.signAsync({ sub: '7' });
      const response = await request(app.getHttpServer())
        .patch('/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '새닉네임' })
        .expect(409);
      expect(response.body.code).toBe('MEMBER409_1');
      expect(response.body.message).toBe('이미 사용 중인 닉네임입니다.');
    });

    it('preserves unrelated save failures as a safe 500 response', async () => {
      repository.save.mockRejectedValueOnce(new Error('private SQL details'));
      const token = await jwtService.signAsync({ sub: '7' });
      const response = await request(app.getHttpServer())
        .patch('/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '새닉네임' })
        .expect(500);
      expect(response.body).toEqual({
        isSuccess: false,
        code: 'COMMON500',
        message: '서버 오류가 발생했습니다.',
        result: null,
      });
    });
  });
});

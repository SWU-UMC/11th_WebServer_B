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

describe('GET /members/me', () => {
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
});

import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { setupApp } from '../app.setup';
import { Member } from '../entity/member.entity';
import { AuthService } from '../service/auth.service';
import { AuthController } from './auth.controller';

describe('POST /auth/login', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let member: Member;
  const password = 'legacy';
  const repository = {
    findOne: jest.fn<(where: object) => Promise<Member | null>>(),
  };

  beforeAll(async () => {
    member = Object.assign(new Member(), {
      memberId: 7,
      email: 'movie@umc.com',
      nickname: '영화광',
      password: await bcrypt.hash(password, 4),
    });
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-only-login-secret-at-least-32-characters',
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: getRepositoryToken(Member), useValue: repository },
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

  it('returns 200 and a signed token without exposing the password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: member.email, password })
      .expect(200);

    expect(response.body).toEqual({
      isSuccess: true,
      code: 'COMMON200',
      message: '로그인에 성공했습니다.',
      result: { nickname: member.nickname, accessToken: expect.any(String) },
    });
    const payload = await jwtService.verifyAsync<{
      sub: string;
      email: string;
      iat: number;
      exp: number;
    }>(response.body.result.accessToken);
    expect(payload.sub).toBe('7');
    expect(payload.email).toBe(member.email);
    expect(payload.exp - payload.iat).toBe(3600);
    expect(JSON.stringify(response.body)).not.toContain(member.password);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { email: member.email },
    });
  });

  it('returns the same 401 response for an unknown email and a wrong password', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    const unknown = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unknown@umc.com', password })
      .expect(401);
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: member.email, password: 'wrong' })
      .expect(401);

    expect(unknown.body).toEqual({
      isSuccess: false,
      code: 'AUTH401_1',
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      result: null,
    });
    expect(wrong.body).toEqual(unknown.body);
  });

  it.each([
    {},
    { email: 'invalid', password },
    { email: '', password },
    { email: 'movie@umc.com' },
    { email: 'movie@umc.com', password: '' },
    { email: 'movie@umc.com', password: 123 },
    { email: 'movie@umc.com', password: null },
    { email: 'movie@umc.com', password, memberId: 9 },
  ])('rejects invalid login input %j before querying the database', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body)
      .expect(400);

    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON400',
      message: expect.any(String),
      result: null,
    });
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('hides database errors in the common 500 response', async () => {
    repository.findOne.mockRejectedValueOnce(new Error('private DB details'));
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: member.email, password })
      .expect(500);

    expect(response.body).toEqual({
      isSuccess: false,
      code: 'COMMON500',
      message: '서버 오류가 발생했습니다.',
      result: null,
    });
  });
});

import {
  Controller,
  Get,
  INestApplication,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { setupApp } from '../app.setup';
import { AuthGuard } from './auth.guard';

@Controller('guard-test')
class GuardTestController {
  @Get()
  @UseGuards(AuthGuard)
  protectedRoute(@Req() req: Request & { memberId: number }) {
    return { memberId: req.memberId };
  }

  @Get('public')
  publicRoute() {
    return { public: true };
  }
}

describe('AuthGuard HTTP', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-only-guard-secret-at-least-32-characters',
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [GuardTestController],
      providers: [AuthGuard],
    }).compile();
    jwtService = module.get(JwtService);
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes the verified numeric member ID to the controller', async () => {
    const token = await jwtService.signAsync({ sub: '7', email: 'a@umc.com' });
    await request(app.getHttpServer())
      .get('/guard-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { memberId: 7 });
  });

  it.each([undefined, 'Basic credentials'])(
    'rejects missing Bearer authentication %s',
    async (header) => {
      const req = request(app.getHttpServer()).get('/guard-test');
      if (header) req.set('Authorization', header);
      const response = await req.expect(401);
      expect(response.body).toEqual({
        isSuccess: false,
        code: 'AUTH401_2',
        message: '로그인이 필요한 요청입니다.',
        result: null,
      });
    },
  );

  it('rejects a token with a modified payload and unchanged signature', async () => {
    const token = await jwtService.signAsync({ sub: '7' });
    const [header, , signature] = token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: '8' })).toString(
      'base64url',
    );
    const response = await request(app.getHttpServer())
      .get('/guard-test')
      .set('Authorization', `Bearer ${header}.${payload}.${signature}`)
      .expect(401);
    expect(response.body.code).toBe('AUTH401_3');
    expect(response.body.result).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await jwtService.signAsync(
      { sub: '7' },
      { secret: 'another-test-secret' },
    );
    const response = await request(app.getHttpServer())
      .get('/guard-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body.code).toBe('AUTH401_3');
  });

  it('returns a distinct error for an expired token', async () => {
    const token = await jwtService.signAsync({ sub: '7' }, { expiresIn: -1 });
    const response = await request(app.getHttpServer())
      .get('/guard-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body).toEqual({
      isSuccess: false,
      code: 'AUTH401_4',
      message: '토큰이 만료되었습니다. 다시 로그인해주세요.',
      result: null,
    });
  });

  it.each([
    {},
    { sub: 'invalid' },
    { sub: '0' },
    { sub: '-1' },
    { sub: '1.5' },
  ])('rejects signed tokens without a valid member ID %j', async (payload) => {
    const token = await jwtService.signAsync(payload);
    const response = await request(app.getHttpServer())
      .get('/guard-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body.code).toBe('AUTH401_3');
  });

  it('rejects malformed tokens', async () => {
    const response = await request(app.getHttpServer())
      .get('/guard-test')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    expect(response.body.code).toBe('AUTH401_3');
  });

  it('leaves routes without the guard public', async () => {
    await request(app.getHttpServer())
      .get('/guard-test/public')
      .expect(200, { public: true });
  });
});

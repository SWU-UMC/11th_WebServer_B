// 실제 MySQL 검증: 매 실행마다 별도 DB를 만들고 종료 시 해당 DB만 제거합니다.
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { DataSource } = require('typeorm');
const { Test } = require('@nestjs/testing');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { getRepositoryToken } = require('@nestjs/typeorm');
const request = require('supertest');
const { Member } = require('../dist/entity/member.entity');
const { Rating } = require('../dist/entity/rating.entity');
const { Favorite } = require('../dist/entity/favorite.entity');
const {
  FavoriteController,
} = require('../dist/controller/favorite.controller');
const {
  MovieRecordController,
} = require('../dist/controller/movie-record.controller');
const { FavoriteService } = require('../dist/service/favorite.service');
const { MovieRecordService } = require('../dist/service/movie-record.service');
const { setupApp } = require('../dist/app.setup');

const database = `umc_week8_test_${process.pid}_${Date.now()}`;
let admin, source, app, jwt, memberA, memberB;
const evidence = [];
const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
const auth = (method, path, member = memberA) =>
  request(app.getHttpServer())
    [method](path)
    .set(
      'Authorization',
      `Bearer ${jwt.sign({ sub: String(member.memberId) })}`,
    );
const capture = (name, method, url, response) => {
  evidence.push({
    name,
    method,
    url,
    status: response.status,
    body: response.body,
  });
  return response.body;
};

before(async () => {
  assert.ok(
    ['localhost', '127.0.0.1', '::1'].includes(config.host),
    '이 테스트는 로컬 MySQL에서만 실행합니다. DB_HOST를 확인하세요.',
  );
  admin = await mysql.createConnection(config);
  await admin.query(`CREATE DATABASE \`${database}\``);
  source = new DataSource({
    type: 'mysql',
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database,
    entities: [Member, Rating, Favorite],
    synchronize: true,
  });
  await source.initialize();
  const members = source.getRepository(Member);
  memberA = await members.save(
    members.create({
      email: 'week8-a@example.com',
      nickname: 'week8-a',
      password: 'test-only-no-login',
    }),
  );
  memberB = await members.save(
    members.create({
      email: 'week8-b@example.com',
      nickname: 'week8-b',
      password: 'test-only-no-login',
    }),
  );
  const module = await Test.createTestingModule({
    imports: [
      JwtModule.register({
        global: true,
        secret: 'week8-integration-test-only-secret',
      }),
    ],
    controllers: [FavoriteController, MovieRecordController],
    providers: [
      FavoriteService,
      MovieRecordService,
      { provide: DataSource, useValue: source },
      { provide: getRepositoryToken(Member), useValue: members },
      {
        provide: getRepositoryToken(Favorite),
        useValue: source.getRepository(Favorite),
      },
    ],
  }).compile();
  jwt = module.get(JwtService);
  app = module.createNestApplication();
  setupApp(app);
  await app.init();
});

after(async () => {
  try {
    if (app) await app.close();
  } finally {
    try {
      if (source?.isInitialized) await source.destroy();
    } finally {
      if (admin) {
        try {
          await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        } finally {
          await admin.end();
        }
      }
    }
  }
  if (process.env.WEEK8_EVIDENCE_PATH && evidence.length) {
    require('node:fs').writeFileSync(
      process.env.WEEK8_EVIDENCE_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          source: 'Nest HTTP + isolated local MySQL',
          responses: evidence,
        },
        null,
        2,
      ) + '\n',
    );
  }
});

test('즐겨찾기 등록·중복·최신순 목록·여부·해제 및 회원 분리', async () => {
  let response = await auth('get', '/favorites/550').expect(200);
  assert.equal(
    capture('등록 전 여부', 'GET', '/favorites/550', response).result
      .isFavorite,
    false,
  );
  response = await auth('post', '/favorites')
    .send({ movieId: 550 })
    .expect(201);
  assert.equal(
    capture('등록', 'POST', '/favorites', response).result.movieId,
    550,
  );
  response = await auth('post', '/favorites')
    .send({ movieId: 550 })
    .expect(409);
  assert.equal(
    capture('중복 등록', 'POST', '/favorites', response).code,
    'FAVORITE409_1',
  );
  await auth('post', '/favorites').send({ movieId: 238 }).expect(201);
  response = await auth('get', '/favorites').expect(200);
  assert.deepEqual(
    capture('내 목록', 'GET', '/favorites', response).result.map(
      (f) => f.movieId,
    ),
    [238, 550],
  );
  response = await auth('get', '/favorites/550').expect(200);
  assert.equal(
    capture('등록 후 여부', 'GET', '/favorites/550', response).result
      .isFavorite,
    true,
  );
  assert.deepEqual(
    (await auth('get', '/favorites', memberB).expect(200)).body.result,
    [],
  );
  assert.equal(
    (await auth('get', '/favorites/550', memberB).expect(200)).body.result
      .isFavorite,
    false,
  );
  await auth('delete', '/favorites/550', memberB).expect(404);
  await auth('post', '/favorites', memberB).send({ movieId: 550 }).expect(201);
  response = await auth('delete', '/favorites/550').expect(200);
  assert.deepEqual(capture('해제', 'DELETE', '/favorites/550', response), {
    isSuccess: true,
    code: 'COMMON200',
    message: '즐겨찾기를 해제했습니다.',
    result: null,
  });
  assert.equal(
    (await auth('get', '/favorites/550', memberB).expect(200)).body.result
      .isFavorite,
    true,
  );
  response = await auth('get', '/favorites/550').expect(200);
  assert.equal(
    capture('해제 후 여부', 'GET', '/favorites/550', response).result
      .isFavorite,
    false,
  );
  assert.equal(
    (await auth('delete', '/favorites/550').expect(404)).body.code,
    'FAVORITE404_1',
  );
});

test('인증, 입력 검증과 공통 오류 응답', async () => {
  for (const [method, path] of [
    ['post', '/favorites'],
    ['get', '/favorites'],
    ['get', '/favorites/550'],
    ['delete', '/favorites/550'],
    ['post', '/movie-records'],
  ]) {
    const response = await request(app.getHttpServer())
      [method](path)
      .expect(401);
    assert.equal(response.body.isSuccess, false);
    assert.equal(response.body.result, null);
  }
  for (const dto of [
    {},
    { movieId: 0 },
    { movieId: -1 },
    { movieId: 1.5 },
    { movieId: '550' },
    { movieId: 550, memberId: memberB.memberId },
  ]) {
    await auth('post', '/favorites').send(dto).expect(400);
  }
  await auth('get', '/favorites/not-a-number').expect(400);
  const dto = { movieId: 13, score: 5, addToFavorites: true };
  for (const patch of [
    { score: 0 },
    { score: 6 },
    { score: 1.5 },
    { addToFavorites: 'true' },
    { addToFavorites: null },
    { memberId: 1 },
  ]) {
    await auth('post', '/movie-records')
      .send({ ...dto, ...patch })
      .expect(400);
  }
});

test('영화 기록 동시 저장 및 평점만 저장', async () => {
  const response = await auth('post', '/movie-records')
    .send({
      movieId: 13,
      score: 5,
      comment: '다시 보고 싶은 영화',
      addToFavorites: true,
    })
    .expect(201);
  const result = capture(
    '영화 기록 저장',
    'POST',
    '/movie-records',
    response,
  ).result;
  assert.equal(result.rating.movieId, 13);
  assert.equal(result.favorite.movieId, 13);
  assert.equal(
    await source
      .getRepository(Rating)
      .countBy({ member: { memberId: memberA.memberId }, movieId: 13 }),
    1,
  );
  assert.equal(
    await source
      .getRepository(Favorite)
      .countBy({ member: { memberId: memberA.memberId }, movieId: 13 }),
    1,
  );
  assert.equal(
    (
      await auth('post', '/movie-records')
        .send({ movieId: 14, score: 4, addToFavorites: false })
        .expect(201)
    ).body.result.favorite,
    null,
  );
  assert.equal(
    await source.getRepository(Favorite).countBy({ movieId: 14 }),
    0,
  );
  assert.equal(
    (
      await auth('post', '/movie-records')
        .send({ movieId: 13, score: 5, addToFavorites: true })
        .expect(409)
    ).body.code,
    'RATING409_1',
  );
  await auth('post', '/favorites').send({ movieId: 15 }).expect(201);
  assert.equal(
    (
      await auth('post', '/movie-records')
        .send({ movieId: 15, score: 5, addToFavorites: true })
        .expect(409)
    ).body.code,
    'FAVORITE409_1',
  );
  assert.equal(await source.getRepository(Rating).countBy({ movieId: 15 }), 0);
  await auth('post', '/movie-records')
    .send({ movieId: 15, score: 5, addToFavorites: false })
    .expect(201);
});

test('평점 SQL 저장 후 즐겨찾기 UNIQUE 충돌 시 실제 MySQL 전체 롤백', async () => {
  const originalTransaction = source.transaction.bind(source);
  let ratingWasWritten = false;
  // 사전 검사 후 동시 요청이 끼어든 상황을 같은 트랜잭션 안에서 재현합니다.
  source.transaction = (callback) =>
    originalTransaction(async (manager) => {
      const favorites = manager.getRepository(Favorite);
      const originalSave = favorites.save.bind(favorites);
      favorites.save = async (favorite) => {
        ratingWasWritten = await manager
          .getRepository(Rating)
          .existsBy({ movieId: 16 });
        await manager.insert(Favorite, { member: memberA, movieId: 16 });
        return originalSave(favorite); // 실제 UNIQUE 제약 오류 발생
      };
      try {
        return await callback(manager);
      } finally {
        favorites.save = originalSave;
      }
    });
  try {
    const service = new MovieRecordService(source);
    await assert.rejects(
      service.create(memberA.memberId, {
        movieId: 16,
        score: 5,
        addToFavorites: true,
      }),
      (error) => error.driverError?.code === 'ER_DUP_ENTRY',
    );
  } finally {
    source.transaction = originalTransaction;
  }
  assert.equal(ratingWasWritten, true);
  assert.equal(await source.getRepository(Rating).countBy({ movieId: 16 }), 0);
  assert.equal(
    await source.getRepository(Favorite).countBy({ movieId: 16 }),
    0,
  );
});

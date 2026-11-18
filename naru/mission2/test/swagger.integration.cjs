require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { JwtModule } = require('@nestjs/jwt');
const request = require('supertest');
const {
  FavoriteController,
} = require('../dist/controller/favorite.controller');
const {
  MovieRecordController,
} = require('../dist/controller/movie-record.controller');
const { AuthController } = require('../dist/controller/auth.controller');
const { FavoriteService } = require('../dist/service/favorite.service');
const { MovieRecordService } = require('../dist/service/movie-record.service');
const { AuthService } = require('../dist/service/auth.service');
const { setupSwagger } = require('../dist/swagger/swagger.setup');

test('Swagger UI, 8주차 요청·응답 및 공개 로그인/보호 API 구분', async () => {
  const module = await Test.createTestingModule({
    imports: [
      JwtModule.register({ global: true, secret: 'swagger-test-only-secret' }),
    ],
    controllers: [FavoriteController, MovieRecordController, AuthController],
    providers: [
      { provide: FavoriteService, useValue: {} },
      { provide: MovieRecordService, useValue: {} },
      { provide: AuthService, useValue: {} },
    ],
  }).compile();
  const app = module.createNestApplication();
  setupSwagger(app);
  await app.init();
  try {
    const ui = await request(app.getHttpServer()).get('/api-docs/').expect(200);
    assert.match(ui.text, /Swagger UI/);
    await request(app.getHttpServer())
      .get('/api-docs/swagger-ui-bundle.js')
      .expect(200);
    const spec = (
      await request(app.getHttpServer()).get('/api-docs-json').expect(200)
    ).body;
    assert.equal(spec.components.securitySchemes.bearer.scheme, 'bearer');
    const operations = [
      spec.paths['/favorites'].post,
      spec.paths['/favorites'].get,
      spec.paths['/favorites/{movieId}'].get,
      spec.paths['/favorites/{movieId}'].delete,
      spec.paths['/movie-records'].post,
    ];
    for (const operation of operations) {
      assert.deepEqual(operation.security, [{ bearer: [] }]);
      assert.ok(operation.responses['401']);
      assert.ok(operation.responses['500']);
      assert.ok(
        !operation.parameters.some(
          (parameter) => parameter.name === 'memberId',
        ),
      );
      const unauthorized =
        operation.responses['401'].content['application/json'].examples;
      assert.deepEqual(Object.keys(unauthorized).sort(), [
        'AUTH401_2',
        'AUTH401_3',
        'AUTH401_4',
      ]);
    }
    assert.equal(spec.paths['/auth/login'].post.security, undefined);
    const schemas = spec.components.schemas;
    assert.deepEqual(schemas.CreateFavoriteDto.required, ['movieId']);
    assert.deepEqual(schemas.CreateMovieRecordDto.required, [
      'movieId',
      'score',
      'addToFavorites',
    ]);
    assert.equal(schemas.CreateMovieRecordDto.properties.score.maximum, 5);
    assert.equal(
      schemas.MovieRecordResponseDto.properties.favorite.nullable,
      true,
    );
    assert.equal(
      schemas.FavoriteResponseDto.properties.createdAt.format,
      'date-time',
    );
    const favorite = spec.paths['/favorites'].post;
    assert.equal(
      favorite.requestBody.content['application/json'].examples.favorite.value
        .movieId,
      550,
    );
    assert.ok(
      favorite.responses['409'].content['application/json'].examples
        .FAVORITE409_1,
    );
    const records = spec.paths['/movie-records'].post;
    assert.equal(
      records.requestBody.content['application/json'].examples.ratingOnly.value
        .addToFavorites,
      false,
    );
    assert.ok(
      records.responses['409'].content['application/json'].examples.RATING409_1,
    );
    assert.ok(
      records.responses['409'].content['application/json'].examples
        .FAVORITE409_1,
    );
    assert.equal(
      spec.paths['/favorites'].get.responses['200'].content['application/json']
        .schema.properties.result.type,
      'array',
    );
    assert.equal(
      spec.paths['/favorites/{movieId}'].delete.responses['200'].content[
        'application/json'
      ].schema.properties.result.nullable,
      true,
    );
    for (const [name, schema] of Object.entries(schemas)) {
      if (name === 'CreateFavoriteDto' || name === 'CreateMovieRecordDto')
        assert.ok(!schema.properties.memberId);
    }
  } finally {
    await app.close();
  }
});

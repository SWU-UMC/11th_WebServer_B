# 8주차: 즐겨찾기와 영화 기록

## 구현 범위

실습 1~3의 NestJS 코드를 기준으로 필수 API 5개를 구현했다.
실습 4는 워크북의 정상·실패 시나리오 검증 및 미션 기록으로 진행했다.
선택 미션으로 Swagger 요청·응답·Bearer 인증 문서화도 추가했다.

| Method | URL                   | 동작                           | 성공 상태 |
| ------ | --------------------- | ------------------------------ | --------- |
| POST   | `/favorites`          | 즐겨찾기 등록                  | 201       |
| GET    | `/favorites`          | 내 목록, 최신 등록 순          | 200       |
| GET    | `/favorites/:movieId` | 등록 여부, 미등록은 false      | 200       |
| DELETE | `/favorites/:movieId` | 내 즐겨찾기 해제, result: null | 200       |
| POST   | `/movie-records`      | 평점 및 선택적 즐겨찾기 저장   | 201       |

모두 `Authorization: Bearer {accessToken}`을 사용한다.
회원 ID는 AuthGuard가 검증한 토큰의 sub에서 가져온다. URL·바디·쿼리에 회원 ID를 보내지 않는다.
`movieId`는 TMDB 영화 ID이며 영화 테이블 외래 키가 아니다.

## 핵심 코드

- [Favorite 엔티티와 복합 UNIQUE](../../src/entity/favorite.entity.ts)
- [즐겨찾기 요청 DTO](../../src/dto/create-favorite.dto.ts)
- [즐겨찾기 Service](../../src/service/favorite.service.ts)
- [즐겨찾기 Controller](../../src/controller/favorite.controller.ts)
- [영화 기록 요청 DTO](../../src/dto/create-movie-record.dto.ts)
- [영화 기록 Service와 트랜잭션](../../src/service/movie-record.service.ts)
- [영화 기록 Controller](../../src/controller/movie-record.controller.ts)
- [인증 가드](../../src/guard/auth.guard.ts)
- [실제 MySQL 통합 테스트](../../test/week8.integration.cjs)

평점과 즐겨찾기는 한 번의 영화 기록 요청에서 함께 성공해야 하므로, `DataSource.transaction()` 안의 manager가 제공한 Repository로 두 저장을 묶었다.

## 재현과 검증

```sh
npm run lint
npm test -- --runInBand
npm run test:week8
```

`test:week8`은 먼저 빌드한 다음 Node 테스트 러너로 실제 MySQL과 Nest HTTP를 검증한다.
`.env`의 `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`를 사용한다.
로컬 호스트만 허용하며 실행별로 `umc_week8_test_...` DB를 생성한다.
CREATE/DROP DATABASE 권한이 필요하다. 종료 시 해당 테스트 DB만 제거하고 기존 서비스 DB는 수정하지 않는다.
비정상 종료로 테스트 DB가 남을 경우 해당 실행의 테스트 DB만 확인하여 정리한다.

응답 증거를 다시 저장하려면:

```sh
WEEK8_EVIDENCE_PATH=docs/week8/responses.json npm run test:week8
```

### 2026-11-18 검증 결과

- 린트 및 빌드 통과
- 기존 Jest 테스트: 11개 스위트, 195개 테스트 통과
- MySQL 통합 테스트: 4개 시나리오 통과
  - 즐겨찾기 등록·중복 409·최신순 목록·여부·해제 및 회원별 데이터 분리
  - 인증 401, 잘못된 입력 400, 요청 바디의 memberId 거절
  - 평점·즐겨찾기 동시 저장, 평점만 저장, 기존 평점·즐겨찾기 중복 오류
  - 평점 SQL 실행 후 즐겨찾기 UNIQUE 오류 발생 시 실제 롤백
- 기존 로컬 DB의 `SHOW CREATE TABLE favorite`에서 InnoDB, 회원 FK, `(member_id, movie_id)` UNIQUE 확인
- [실제 HTTP 응답 기록](responses.json): 토큰·비밀번호 없이 상태 코드와 응답 본문만 저장

롤백 테스트는 즐겨찾기 Repository의 save 직전에 같은 트랜잭션으로 중복 행을 삽입한다.
평점이 실제 저장되어 있는지 먼저 확인한 뒤 실제 UNIQUE 오류를 발생시킨다.
예외가 트랜잭션 밖으로 나간 뒤 별도 Repository 조회에서 평점과 즐겨찾기가 모두 0건인지 검증한다.
이는 롤백 재현용 실패 주입이며, 실제 동시 요청 부하 테스트는 아니다.

## Postman 제출 준비

[Collection 가져오기](postman.collection.json).
`baseUrl`을 실행 중인 서버 주소로 설정하고 로그인 응답의 토큰을 `accessToken`에 입력한다.
`movieId`는 아직 즐겨찾기하지 않은 영화, `recordMovieId`는 평점·즐겨찾기가 없는 영화로 설정한다.
재실행 시 `recordMovieId`를 새 값으로 바꾼다.
컬렉션은 상태 코드·공통 응답·주요 결과를 자동 검사한다.

실행 순서: 등록 전 여부 → 등록 → 중복 → 목록 → 등록 후 여부 → 해제 → 해제 후 여부 → 영화 기록.

### 캡처 체크리스트

아래 항목은 제출용 Postman 화면 캡처가 필요하다. 현재 커밋에는 실제 HTTP JSON 응답 증거와 요청 모음을 제공하며, Postman 화면 캡처는 포함하지 않았다.

- [ ] 즐겨찾기 등록 201 및 같은 요청의 `409 FAVORITE409_1`
- [ ] 내 즐겨찾기 목록 200
- [ ] 특정 영화 즐겨찾기 여부 200
- [ ] 즐겨찾기 해제 200, `result: null`
- [ ] 영화 기록 저장 201, `result.rating`과 `result.favorite`
- [ ] Service의 `DataSource.transaction()` 코드 및 두 저장을 묶은 이유

## 문제와 해결 기록

### Jest의 ESM 모듈 실행 실패

- 이슈: 기존 `npm test`에서 NestJS의 ESM 의존성을 CommonJS로 불러오지 못했다.
- 원인: 현재 Jest 실행에 ESM VM 지원 옵션이 없었다.
- 해결: test 스크립트에 `node --experimental-vm-modules`를 적용했다.
- 확인: 기존 테스트 195개 통과.

### 트랜잭션 검증 범위

- 이슈: 중복 사전 검사에서 바로 실패하는 요청만으로는 롤백을 입증할 수 없다.
- 원인: 해당 요청은 첫 저장 이전에 종료되므로 취소할 데이터가 없다.
- 해결: 별도 로컬 MySQL DB에서 첫 저장 후 두 번째 저장의 실제 UNIQUE 오류를 주입했다.
- 확인: 실패 후 두 테이블 모두 해당 영화의 데이터가 남지 않았다.

## 학습 정리

- 트랜잭션: 여러 DB 작업을 하나의 성공·실패 단위로 처리한다.
- commit / rollback: 성공한 작업 확정 / 실패한 작업 취소.
- 원자성: 일부만 저장된 상태를 남기지 않는다.
- ACID: 원자성, 일관성, 격리성, 지속성.
- UNIQUE: 사전 중복 검사가 동시에 통과하더라도 DB에서 중복을 차단한다.
- 낙관적 잠금: 버전 조건으로 변경 충돌을 감지하는 방식이다. 이번 구현에는 적용하지 않았다.

평점만 저장되면 사용자가 선택한 즐겨찾기가 누락되므로 한 요청의 의도가 깨진다.
서버 사전 검사는 명확한 도메인 오류 응답을 제공하고, UNIQUE는 동시 저장에서도 데이터 중복을 막는다.
실제 롤백 검증과 동시 요청 검증은 별개의 범위라는 점을 확인했다.

## 선택 미션: Swagger

서버 실행 후 [Swagger UI](http://localhost:3000/api-docs)에 접속한다.
OpenAPI JSON은 [api-docs-json](http://localhost:3000/api-docs-json)에서 확인할 수 있다.
PORT를 바꿨다면 주소의 포트도 변경한다.

1. 공개 API `POST /auth/login`에서 가입한 계정으로 로그인한다.
2. 응답의 `result.accessToken`을 복사한다.
3. 상단 **Authorize**에 토큰만 입력한다. `Bearer ` 접두사는 UI가 붙인다.
4. `8주차 즐겨찾기` 또는 `8주차 영화 기록`의 **Try it out**으로 요청한다.
5. 응답의 HTTP 상태와 공통 응답의 code를 함께 확인한다.

보호 API에는 자물쇠와 Bearer 인증을 표시한다. 공개 로그인에는 토큰이 필요하지 않다.
내 정보와 평점 등 기존 보호 API에도 인증 표시를 붙였다.
영화 기록 요청은 평점·즐겨찾기를 함께 저장하는 예시와 평점만 저장하는 예시를 제공한다.
성공 응답은 공통 구조 안에 DTO 스키마를 연결하며,
실패 응답은 상태별 예시(400/401/404/409/500, 해당 API에 적용되는 경우)를 제공한다.
409는 평점 중복과 즐겨찾기 중복 예시를 선택해 볼 수 있다.

- [Swagger 초기화 코드](../../src/swagger/swagger.setup.ts)
- [공통 응답 문서 데코레이터](../../src/swagger/api-response.decorator.ts)
- [Swagger 검증 코드](../../test/swagger.integration.cjs)

```sh
npm run test:swagger
```

이 검증은 DB 없이 Swagger UI·정적 JS·OpenAPI JSON을 HTTP로 조회한다.
8주차 API 5개의 Bearer 요구 사항, 공개 로그인, 요청 필수 필드,
성공 envelope와 배열/null 응답, 인증 및 중복 오류 예시를 확인한다.
UI에서 실제 API를 실행하려면 기존 MySQL 설정과 유효한 로그인 계정이 필요하다.

선택 미션 제출 화면 캡처는 아직 포함하지 않았다.
캡처 대상은 Swagger UI의 8주차 API 목록 및 한 API의 요청·응답 예시 화면이다.

참고: [NestJS OpenAPI 초기화](https://docs.nestjs.com/openapi/introduction),
[Bearer 인증](https://docs.nestjs.com/openapi/security),
[DTO 스키마](https://docs.nestjs.com/openapi/types-and-parameters),
[응답 문서화](https://docs.nestjs.com/openapi/operations).

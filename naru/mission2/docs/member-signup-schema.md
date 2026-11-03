# 회원가입 준비: DB 호환성

2026-11-03 현재 프로젝트의 `.env`로 연결한 MySQL에서
`SHOW CREATE TABLE member`를 읽기 전용으로 확인했다.

| 항목     | Member 엔티티        | 실제 DB                                 |
| -------- | -------------------- | --------------------------------------- |
| email    | varchar(254), UNIQUE | varchar(254) NOT NULL, 단일 컬럼 UNIQUE |
| nickname | varchar(50), UNIQUE  | varchar(50) NOT NULL, 단일 컬럼 UNIQUE  |
| password | varchar(60)          | varchar(60) NOT NULL                    |

bcrypt 해시는 60자이므로 기존 password 컬럼을 그대로 사용할 수 있다.
이번 변경에 필요한 DDL이나 마이그레이션은 없다. DB 데이터와 엔티티는
수정하지 않았으며 `synchronize: false`를 유지한다.
nickname의 2~12자 제한은 신규 가입 DTO의 입력 규칙으로만 적용하여
기존 저장 데이터와 DB 컬럼 길이를 유지한다.

## 다른 DB에 적용하기 전 확인

```sql
SHOW CREATE TABLE member;
SHOW INDEX FROM member;
```

위 구조와 같으면 스키마 변경 없이 적용한다. 구조가 다르면 먼저 백업하고
스테이징 복사본에서 검증한 뒤 별도 마이그레이션을 작성한다.

- password가 없다면 기존 행 보존을 위해 우선 nullable varchar(60)을
  추가한다. 기존 회원의 비밀번호 설정/재설정 절차로 bcrypt 해시를 채우고,
  NULL이 없는 것을 확인한 뒤 NOT NULL로 변경한다. 임의 공통 비밀번호나
  빈 문자열로 기존 회원을 채우지 않는다.
- UNIQUE가 없다면 아래 쿼리로 중복을 먼저 확인한다. 중복 행을 자동 삭제하지
  않고 해결한 뒤 email, nickname 각각에 단일 컬럼 UNIQUE를 추가한다.
- MySQL DDL은 암묵적으로 커밋될 수 있으므로 트랜잭션 롤백에 의존하지 않는다.
  이번 변경에는 실행할 DDL이 없으므로 자동 실행 스크립트를 추가하지 않는다.

```sql
SELECT email, COUNT(*) FROM member GROUP BY email HAVING COUNT(*) > 1;
SELECT nickname, COUNT(*) FROM member GROUP BY nickname HAVING COUNT(*) > 1;
```

## 구현 범위

CreateMemberDto는 검증 규칙만 정의한다. 회원가입 Service/Controller,
비밀번호 해싱, 전역 ValidationPipe 연결은 이번 단계에 포함하지 않는다.
추후 가입 API에서 ValidationPipe를 연결하고 bcrypt로 해싱한 값만 저장해야 한다.

## 검증

```bash
npm run build
npm run lint
NODE_OPTIONS=--experimental-vm-modules npm test -- --runInBand
```

현재 NestJS 12의 ESM 의존성을 Jest에서 실행하려면 위 VM Modules 옵션이
필요하다. Jest의 ts-jest 설정에는 TypeScript 6 호환을 위해 rootDir을
명시했으며 애플리케이션 빌드 설정은 변경하지 않았다.

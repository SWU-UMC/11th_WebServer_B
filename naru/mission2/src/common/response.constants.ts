// 공통 응답 코드와 사용자에게 전달할 메시지를 관리합니다.
export function commonResponseCode(status: number): string {
  return `COMMON${status}`;
}

export const SUCCESS_RESPONSES = {
  LOGIN: {
    code: commonResponseCode(200),
    message: '로그인에 성공했습니다.',
  },
  MEMBER_CREATED: {
    code: commonResponseCode(201),
    message: '회원가입에 성공했습니다.',
  },
  RATING_CREATED: {
    code: commonResponseCode(201),
    message: '평점 등록에 성공했습니다.',
  },
  RATING_UPDATED: {
    code: commonResponseCode(200),
    message: '평점 수정에 성공했습니다.',
  },
} as const;

export const MEMBER_CONFLICTS = {
  email: {
    code: 'MEMBER4091',
    message: '이미 사용 중인 이메일입니다.',
  },
  nickname: {
    code: 'MEMBER4092',
    message: '이미 사용 중인 닉네임입니다.',
  },
} as const;

export const ERROR_MESSAGES = {
  LOGIN_REQUIRED: '로그인이 필요한 요청입니다.',
  INVALID_TOKEN: '유효하지 않은 토큰입니다.',
  TOKEN_EXPIRED: '토큰이 만료되었습니다. 다시 로그인해주세요.',
  INVALID_LOGIN: '이메일 또는 비밀번호가 올바르지 않습니다.',
  INTERNAL_SERVER_ERROR: '서버 오류가 발생했습니다.',
  MEMBER_NOT_FOUND: '회원을 찾을 수 없습니다.',
  MEMBER_DUPLICATE: '이미 사용 중인 이메일 또는 닉네임입니다.',
  RATING_NOT_FOUND: '평점을 찾을 수 없습니다.',
  RATING_DUPLICATE: '이미 해당 영화에 평점을 등록했습니다.',
  RATING_FORBIDDEN: '본인의 평점만 수정하거나 삭제할 수 있습니다.',
  INVALID_EMAIL: '올바른 이메일 형식으로 입력해 주세요.',
  INVALID_NICKNAME: '닉네임은 2자 이상 12자 이하로 입력해 주세요.',
  INVALID_PASSWORD:
    '비밀번호는 영문 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다.',
  PAGINATION_OFFSET_TOO_LARGE: '페이지 조회 범위를 초과했습니다.',
  INVALID_PAGINATION: (name: string, minimum: number): string =>
    `${name}는 ${minimum} 이상의 정수여야 합니다.`,
} as const;

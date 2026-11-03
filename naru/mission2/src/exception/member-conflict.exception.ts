import { ConflictException } from '@nestjs/common';

export class MemberConflictException extends ConflictException {
  readonly code: 'MEMBER4091' | 'MEMBER4092';

  constructor(field: 'email' | 'nickname') {
    super(
      field === 'email'
        ? '이미 사용 중인 이메일입니다.'
        : '이미 사용 중인 닉네임입니다.',
    );
    this.code = field === 'email' ? 'MEMBER4091' : 'MEMBER4092';
  }
}

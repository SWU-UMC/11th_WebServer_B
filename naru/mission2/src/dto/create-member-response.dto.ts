import { Member } from '../entity/member.entity';

export class CreateMemberResponseDto {
  readonly isSuccess = true;
  readonly code = 'COMMON201';
  readonly message = '회원가입에 성공했습니다.';
  readonly result: { memberId: number; email: string; nickname: string };

  constructor(member: Member) {
    this.result = {
      memberId: member.memberId,
      email: member.email,
      nickname: member.nickname,
    };
  }
}

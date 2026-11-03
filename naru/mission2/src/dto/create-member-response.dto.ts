import { SUCCESS_RESPONSES } from '../common/response.constants';
import { Member } from '../entity/member.entity';

export class CreateMemberResponseDto {
  readonly isSuccess = true;
  readonly code = SUCCESS_RESPONSES.MEMBER_CREATED.code;
  readonly message = SUCCESS_RESPONSES.MEMBER_CREATED.message;
  readonly result: { memberId: number; email: string; nickname: string };

  constructor(member: Member) {
    this.result = {
      memberId: member.memberId,
      email: member.email,
      nickname: member.nickname,
    };
  }
}

import { Member } from '../entity/member.entity';

export class MemberInfoResponseDto {
  email: string;
  nickname: string;
  createdAt: Date;

  // 비밀번호를 제외한 회원 정보 변환
  static from(member: Member): MemberInfoResponseDto {
    return {
      email: member.email,
      nickname: member.nickname,
      createdAt: member.createdAt,
    };
  }
}

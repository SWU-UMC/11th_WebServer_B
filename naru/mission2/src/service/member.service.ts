import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entity/member.entity';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async isNicknameAvailable(nickname: string): Promise<boolean> {
    const exists = await this.memberRepository.existsBy({ nickname });
    return !exists;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const exists = await this.memberRepository.existsBy({ email });
    return !exists;
  }

  async existsById(memberId: number): Promise<boolean> {
    return this.memberRepository.existsBy({ memberId });
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateMemberDto } from '../dto/create-member.dto';
import { CreateMemberResponseDto } from '../dto/create-member-response.dto';
import { Member } from '../entity/member.entity';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async createMember(dto: CreateMemberDto): Promise<CreateMemberResponseDto> {
    if (!(await this.isEmailAvailable(dto.email))) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    if (!(await this.isNicknameAvailable(dto.nickname))) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    const password = await bcrypt.hash(dto.password, 10);
    const member = this.memberRepository.create({
      email: dto.email,
      nickname: dto.nickname,
      password,
    });
    try {
      const saved = await this.memberRepository.save(member);
      return new CreateMemberResponseDto(saved);
    } catch (error) {
      // Concurrent requests may pass both checks before the UNIQUE constraint wins.
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('이미 사용 중인 이메일 또는 닉네임입니다.');
      }
      throw error;
    }
  }

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

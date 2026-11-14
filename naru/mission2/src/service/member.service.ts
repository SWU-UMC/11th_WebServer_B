import { ERROR_MESSAGES } from '../common/response.constants';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateMemberDto } from '../dto/create-member.dto';
import { CreateMemberResponseDto } from '../dto/create-member-response.dto';
import { Member } from '../entity/member.entity';
import { MemberConflictException } from '../exception/member-conflict.exception';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async createMember(dto: CreateMemberDto): Promise<CreateMemberResponseDto> {
    if (!(await this.isEmailAvailable(dto.email))) {
      throw new MemberConflictException('email');
    }
    if (!(await this.isNicknameAvailable(dto.nickname))) {
      throw new MemberConflictException('nickname');
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
        (error.driverError.code === 'ER_DUP_ENTRY' ||
          error.driverError.errno === 1062)
      ) {
        const driverError = error.driverError;
        const detail: unknown = driverError.sqlMessage ?? driverError.message;
        // Parse only the key name, never the duplicate value (which may contain email/nickname).
        const key =
          typeof detail === 'string'
            ? /for key ['"`]([^'"`]+)['"`]\s*$/i
                .exec(detail)?.[1]
                .split('.')
                .pop()
            : undefined;
        for (const field of ['email', 'nickname'] as const) {
          const names =
            this.memberRepository.metadata?.uniques
              .filter(
                (unique) =>
                  unique.columns.length === 1 &&
                  unique.columns[0].propertyName === field,
              )
              .map((unique) => unique.name) ?? [];
          // Existing DB indexes are named email/nickname; metadata covers TypeORM-generated names.
          if (key === field || (key !== undefined && names.includes(key))) {
            throw new MemberConflictException(field);
          }
        }
        throw new ConflictException(ERROR_MESSAGES.MEMBER_DUPLICATE);
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

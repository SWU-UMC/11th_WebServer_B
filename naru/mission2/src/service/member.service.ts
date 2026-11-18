import { MemberUpdateRequestDto } from '../dto/member-update-request.dto';
import { ERROR_MESSAGES, MEMBER_CONFLICTS } from '../common/response.constants';
import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateMemberDto } from '../dto/create-member.dto';
import { CreateMemberResponseDto } from '../dto/create-member-response.dto';
import { Member } from '../entity/member.entity';
import { MemberConflictException } from '../exception/member-conflict.exception';
import { ApiException } from '../exception/api.exception';
import { MemberInfoResponseDto } from '../dto/member-info-response.dto';

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

  async getMyInfo(memberId: number): Promise<MemberInfoResponseDto> {
    const member = await this.memberRepository.findOne({
      where: { memberId },
    });
    if (!member) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'MEMBER404_1',
        ERROR_MESSAGES.MEMBER_NOT_FOUND,
      );
    }
    return MemberInfoResponseDto.from(member);
  }

  async updateMyInfo(
    memberId: number,
    dto: MemberUpdateRequestDto,
  ): Promise<MemberInfoResponseDto> {
    const member = await this.memberRepository.findOne({ where: { memberId } });
    if (!member) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'MEMBER404_1',
        ERROR_MESSAGES.MEMBER_NOT_FOUND,
      );
    }

    // 본인을 제외한 다른 회원의 닉네임 중복 확인
    const duplicated = await this.memberRepository.findOne({
      where: { nickname: dto.nickname, memberId: Not(memberId) },
    });
    if (duplicated) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'MEMBER409_1',
        MEMBER_CONFLICTS.nickname.message,
      );
    }

    member.nickname = dto.nickname;
    try {
      const saved = await this.memberRepository.save(member);
      return MemberInfoResponseDto.from(saved);
    } catch (error) {
      // 동시 수정 요청으로 발생한 닉네임 중복 저장 처리
      if (
        error instanceof QueryFailedError &&
        (error.driverError.code === 'ER_DUP_ENTRY' ||
          error.driverError.errno === 1062)
      ) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'MEMBER409_1',
          MEMBER_CONFLICTS.nickname.message,
        );
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

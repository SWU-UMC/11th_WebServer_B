import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Member } from '../entity/member.entity';
import { LoginRequestDto } from '../dto/login-request.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { ApiException } from '../exception/api.exception';
import { ERROR_MESSAGES } from '../common/response.constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const member = await this.memberRepository.findOne({
      where: { email: dto.email },
    });

    if (!member) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH401_1',
        ERROR_MESSAGES.INVALID_LOGIN,
      );
    }

    const isPasswordMatched = await bcrypt.compare(dto.password, member.password);
    if (!isPasswordMatched) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH401_1',
        ERROR_MESSAGES.INVALID_LOGIN,
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: String(member.memberId),
      email: member.email,
    });
    return { nickname: member.nickname, accessToken };
  }
}

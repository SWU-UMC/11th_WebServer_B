import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CheckResponseDto } from '../dto/check-response.dto';
import { RatingResponseDto } from '../dto/rating-response.dto';
import { MemberService } from '../service/member.service';
import { RatingService } from '../service/rating.service';

@Controller('members')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly ratingService: RatingService,
  ) {}

  @Get(['nickname', 'nickname/:nickname'])
  async checkNickname(
    @Param('nickname') nicknameParam?: string,
    @Query('nickname') nicknameQuery?: string,
  ): Promise<CheckResponseDto> {
    const nickname = nicknameParam ?? nicknameQuery ?? '';
    const available = await this.memberService.isNicknameAvailable(nickname);
    return new CheckResponseDto(available);
  }

  @Get(['email', 'email/:email'])
  async checkEmail(
    @Param('email') emailParam?: string,
    @Query('email') emailQuery?: string,
  ): Promise<CheckResponseDto> {
    const email = emailParam ?? emailQuery ?? '';
    const available = await this.memberService.isEmailAvailable(email);
    return new CheckResponseDto(available);
  }

  @Get(':memberId/ratings')
  getRatingsByMemberId(
    @Param('memberId', ParseIntPipe) memberId: number,
  ): Promise<RatingResponseDto[]> {
    return this.ratingService.getRatingsByMemberId(memberId);
  }
}

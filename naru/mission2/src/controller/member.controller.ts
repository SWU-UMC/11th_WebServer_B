import { MemberUpdateRequestDto } from '../dto/member-update-request.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../guard/auth.guard';
import { SUCCESS_RESPONSES } from '../common/response.constants';
import { CreateMemberDto } from '../dto/create-member.dto';
import { CreateMemberResponseDto } from '../dto/create-member-response.dto';
import { CheckResponseDto } from '../dto/check-response.dto';
import { RatingResponseDto } from '../dto/rating-response.dto';
import { EmailValidationPipe } from '../pipe/email-validation.pipe';
import { NicknameValidationPipe } from '../pipe/nickname-validation.pipe';
import {
  RatingsPaginationPipe,
  type RatingsPagination,
} from '../pipe/ratings-pagination.pipe';
import { MemberService } from '../service/member.service';
import { RatingService } from '../service/rating.service';

@Controller('members')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly ratingService: RatingService,
  ) {}

  @Post()
  createMember(
    @Body()
    dto: CreateMemberDto,
  ): Promise<CreateMemberResponseDto> {
    return this.memberService.createMember(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMyInfo(@Req() request: Request & { memberId: number }) {
    const result = await this.memberService.getMyInfo(request.memberId);
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.MEMBER_INFO,
      result,
    };
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMyInfo(
    @Req() request: Request & { memberId: number },
    @Body() dto: MemberUpdateRequestDto,
  ) {
    const result = await this.memberService.updateMyInfo(request.memberId, dto);
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.MEMBER_UPDATED,
      result,
    };
  }

  @Get(['nickname', 'nickname/:nickname'])
  async checkNickname(
    @Param('nickname') nicknameParam?: string,
    @Query('nickname') nicknameQuery?: string,
  ): Promise<CheckResponseDto> {
    const nickname = new NicknameValidationPipe().transform(
      nicknameParam ?? nicknameQuery,
    );
    const available = await this.memberService.isNicknameAvailable(nickname);
    return new CheckResponseDto(available);
  }

  @Get(['email', 'email/:email'])
  async checkEmail(
    @Param('email') emailParam?: string,
    @Query('email') emailQuery?: string,
  ): Promise<CheckResponseDto> {
    const email = new EmailValidationPipe().transform(emailParam ?? emailQuery);
    const available = await this.memberService.isEmailAvailable(email);
    return new CheckResponseDto(available);
  }

  @Get(':memberId/ratings')
  getRatingsByMemberId(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Query(new RatingsPaginationPipe()) pagination: RatingsPagination,
  ): Promise<RatingResponseDto[]> {
    return this.ratingService.getRatingsByMemberId(
      memberId,
      pagination.page,
      pagination.size,
    );
  }
}

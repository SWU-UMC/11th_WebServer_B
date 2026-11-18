import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FavoriteResponseDto } from '../dto/favorite-response.dto';
import { FavoriteStatusResponseDto } from '../dto/favorite-status-response.dto';
import {
  ApiFailureResponse,
  ApiProtectedErrors,
  ApiSuccessResponse,
} from '../swagger/api-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateFavoriteDto } from '../dto/create-favorite.dto';
import { AuthGuard } from '../guard/auth.guard';
import { FavoriteService } from '../service/favorite.service';

@ApiTags('8주차 즐겨찾기')
@ApiBearerAuth()
@ApiProtectedErrors()
@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @ApiOperation({
    summary: '즐겨찾기 등록',
    description:
      '토큰의 회원에게 TMDB 영화 ID를 저장합니다. memberId는 요청으로 받지 않습니다.',
  })
  @ApiBody({
    type: CreateFavoriteDto,
    examples: { favorite: { value: { movieId: 550 } } },
  })
  @ApiSuccessResponse(201, '즐겨찾기를 등록했습니다.', FavoriteResponseDto)
  @ApiFailureResponse(400, [
    { code: 'COMMON400', message: '영화 ID는 양수여야 합니다.' },
  ])
  @ApiFailureResponse(404, [
    { code: 'MEMBER404_1', message: '해당 회원을 찾을 수 없습니다.' },
  ])
  @ApiFailureResponse(409, [
    { code: 'FAVORITE409_1', message: '이미 이 영화를 즐겨찾기하셨습니다.' },
  ])
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: Request & { memberId: number },
    @Body() dto: CreateFavoriteDto,
  ) {
    const memberId = request.memberId;
    const result = await this.favoriteService.create(memberId, dto);

    return {
      isSuccess: true,
      code: 'COMMON201',
      message: '즐겨찾기를 등록했습니다.',
      result,
    };
  }

  @ApiOperation({
    summary: '내 즐겨찾기 목록 조회',
    description:
      '로그인 회원의 목록을 최신 등록 순으로 반환합니다. 빈 목록은 []입니다.',
  })
  @ApiSuccessResponse(
    200,
    '내 즐겨찾기 목록을 조회했습니다.',
    FavoriteResponseDto,
    true,
  )
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyFavorites(@Req() request: Request & { memberId: number }) {
    const memberId = request.memberId;
    const result = await this.favoriteService.getMyFavorites(memberId);

    return {
      isSuccess: true,
      code: 'COMMON200',
      message: '내 즐겨찾기 목록을 조회했습니다.',
      result,
    };
  }

  @ApiOperation({ summary: '특정 영화의 즐겨찾기 여부 조회' })
  @ApiParam({
    name: 'movieId',
    type: 'integer',
    example: 550,
    description: 'TMDB 영화 ID',
  })
  @ApiSuccessResponse(
    200,
    '즐겨찾기 여부를 조회했습니다.',
    FavoriteStatusResponseDto,
  )
  @ApiFailureResponse(400, [
    {
      code: 'COMMON400',
      message: 'Validation failed (numeric string is expected)',
    },
  ])
  @Get(':movieId')
  @HttpCode(HttpStatus.OK)
  async getStatus(
    @Req() request: Request & { memberId: number },
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    const memberId = request.memberId;
    const result = await this.favoriteService.getStatus(memberId, movieId);

    return {
      isSuccess: true,
      code: 'COMMON200',
      message: '즐겨찾기 여부를 조회했습니다.',
      result,
    };
  }

  @ApiOperation({ summary: '내 즐겨찾기 해제' })
  @ApiParam({
    name: 'movieId',
    type: 'integer',
    example: 550,
    description: 'TMDB 영화 ID',
  })
  @ApiSuccessResponse(200, '즐겨찾기를 해제했습니다.')
  @ApiFailureResponse(400, [
    {
      code: 'COMMON400',
      message: 'Validation failed (numeric string is expected)',
    },
  ])
  @ApiFailureResponse(404, [
    { code: 'FAVORITE404_1', message: '즐겨찾기한 영화를 찾을 수 없습니다.' },
  ])
  @Delete(':movieId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Req() request: Request & { memberId: number },
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    const memberId = request.memberId;
    await this.favoriteService.delete(memberId, movieId);

    return {
      isSuccess: true,
      code: 'COMMON200',
      message: '즐겨찾기를 해제했습니다.',
      result: null,
    };
  }
}

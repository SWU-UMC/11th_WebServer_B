import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MovieRecordResponseDto } from '../dto/movie-record-response.dto';
import { FavoriteResponseDto } from '../dto/favorite-response.dto';
import { RatingResponseDto } from '../dto/rating-response.dto';
import {
  ApiFailureResponse,
  ApiProtectedErrors,
  ApiSuccessResponse,
} from '../swagger/api-response.decorator';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateMovieRecordDto } from '../dto/create-movie-record.dto';
import { AuthGuard } from '../guard/auth.guard';
import { MovieRecordService } from '../service/movie-record.service';

@ApiTags('8주차 영화 기록')
@ApiBearerAuth()
@ApiProtectedErrors()
@ApiExtraModels(RatingResponseDto, FavoriteResponseDto)
@Controller('movie-records')
@UseGuards(AuthGuard)
export class MovieRecordController {
  constructor(private readonly movieRecordService: MovieRecordService) {}

  @ApiOperation({
    summary: '평점과 선택적 즐겨찾기 저장',
    description:
      'addToFavorites가 true이면 평점과 즐겨찾기를 같은 트랜잭션에서 저장합니다. false이면 평점만 저장하고 favorite는 null입니다. 저장 실패 시 모두 롤백합니다.',
  })
  @ApiBody({
    type: CreateMovieRecordDto,
    examples: {
      both: {
        summary: '평점과 즐겨찾기 함께',
        value: {
          movieId: 238,
          score: 5,
          comment: '다시 보고 싶은 영화입니다.',
          addToFavorites: true,
        },
      },
      ratingOnly: {
        summary: '평점만',
        value: { movieId: 238, score: 4, addToFavorites: false },
      },
    },
  })
  @ApiSuccessResponse(201, '영화 기록을 저장했습니다.', MovieRecordResponseDto)
  @ApiFailureResponse(400, [
    { code: 'COMMON400', message: '별점은 5점 이하여야 합니다.' },
  ])
  @ApiFailureResponse(404, [
    { code: 'MEMBER404_1', message: '해당 회원을 찾을 수 없습니다.' },
  ])
  @ApiFailureResponse(409, [
    { code: 'RATING409_1', message: '이미 이 영화에 평점을 남기셨습니다.' },
    { code: 'FAVORITE409_1', message: '이미 이 영화를 즐겨찾기하셨습니다.' },
  ])
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: Request & { memberId: number },
    @Body() dto: CreateMovieRecordDto,
  ) {
    const memberId = request.memberId;
    const result = await this.movieRecordService.create(memberId, dto);

    return {
      isSuccess: true,
      code: 'COMMON201',
      message: '영화 기록을 저장했습니다.',
      result,
    };
  }
}

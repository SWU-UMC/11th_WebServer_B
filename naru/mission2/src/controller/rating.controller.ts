import type { Request } from 'express';
import { AuthGuard } from '../guard/auth.guard';
import { SUCCESS_RESPONSES } from '../common/response.constants';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { UpdateRatingDto } from '../dto/update-rating.dto';
import { RatingService } from '../service/rating.service';

@Controller('ratings')
@UseGuards(AuthGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  async createRating(
    @Req() request: Request & { memberId: number },
    @Body() dto: CreateRatingDto,
  ) {
    const result = await this.ratingService.createRating(request.memberId, dto);
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.RATING_CREATED,
      result,
    };
  }

  @Patch(':ratingId')
  async updateRating(
    @Req() request: Request & { memberId: number },
    @Param('ratingId', ParseIntPipe) ratingId: number,
    @Body() dto: UpdateRatingDto,
  ) {
    const result = await this.ratingService.updateRating(
      request.memberId,
      ratingId,
      dto,
    );
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.RATING_UPDATED,
      result,
    };
  }

  @Delete(':ratingId')
  @HttpCode(HttpStatus.OK)
  async deleteRating(
    @Req() request: Request & { memberId: number },
    @Param('ratingId', ParseIntPipe) ratingId: number,
  ) {
    await this.ratingService.deleteRating(request.memberId, ratingId);
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.RATING_DELETED,
      result: null,
    };
  }
}

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
} from '@nestjs/common';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { UpdateRatingDto } from '../dto/update-rating.dto';
import { RatingService } from '../service/rating.service';

@Controller('members/:memberId/ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  async createRating(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: CreateRatingDto,
  ) {
    const ratingId = await this.ratingService.createRating(memberId, dto);
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.RATING_CREATED,
      result: ratingId,
    };
  }

  @Patch(':ratingId')
  async updateRating(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Param('ratingId', ParseIntPipe) ratingId: number,
    @Body() dto: UpdateRatingDto,
  ) {
    const updatedId = await this.ratingService.updateRating(
      memberId,
      ratingId,
      dto,
    );
    return {
      isSuccess: true,
      ...SUCCESS_RESPONSES.RATING_UPDATED,
      result: updatedId,
    };
  }

  @Delete(':ratingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRating(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Param('ratingId', ParseIntPipe) ratingId: number,
  ): Promise<void> {
    await this.ratingService.deleteRating(memberId, ratingId);
  }
}

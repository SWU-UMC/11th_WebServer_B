import { ERROR_MESSAGES } from '../common/response.constants';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { UpdateRatingDto } from '../dto/update-rating.dto';
import { RatingResponseDto } from '../dto/rating-response.dto';
import { Member } from '../entity/member.entity';
import { Rating } from '../entity/rating.entity';
import { MemberService } from './member.service';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    private readonly memberService: MemberService,
  ) {}

  async createRating(memberId: number, dto: CreateRatingDto): Promise<number> {
    if (!(await this.memberService.existsById(memberId))) {
      throw new NotFoundException(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    const exists = await this.ratingRepository.existsBy({
      member: { memberId },
      movieId: dto.movieId,
    });
    if (exists) throw new ConflictException(ERROR_MESSAGES.RATING_DUPLICATE);

    const rating = this.ratingRepository.create({
      member: { memberId },
      movieId: dto.movieId,
      score: dto.score,
      comment: dto.comment ?? null,
    });
    try {
      const saved = await this.ratingRepository.save(rating);
      return Number(saved.ratingId);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(ERROR_MESSAGES.RATING_DUPLICATE);
      }
      throw error;
    }
  }

  async updateRating(
    memberId: number,
    ratingId: number,
    dto: UpdateRatingDto,
  ): Promise<number> {
    const rating = await this.getOwnedRating(memberId, ratingId);
    rating.score = dto.score;
    if (dto.comment !== undefined) rating.comment = dto.comment;
    const saved = await this.ratingRepository.save(rating);
    return Number(saved.ratingId);
  }

  async deleteRating(memberId: number, ratingId: number): Promise<void> {
    const rating = await this.getOwnedRating(memberId, ratingId);
    await this.ratingRepository.remove(rating);
  }

  private async getOwnedRating(
    memberId: number,
    ratingId: number,
  ): Promise<Rating> {
    const rating = await this.ratingRepository.findOne({
      where: { ratingId },
      relations: { member: true },
    });
    if (!rating) throw new NotFoundException(ERROR_MESSAGES.RATING_NOT_FOUND);
    if (Number(rating.member.memberId) !== memberId) {
      throw new ForbiddenException(ERROR_MESSAGES.RATING_FORBIDDEN);
    }
    return rating;
  }

  async getRatingsByMemberId(
    memberId: number,
    page = 0,
    size = 10,
  ): Promise<RatingResponseDto[]> {
    const memberExists = await this.memberService.existsById(memberId);

    if (!memberExists) {
      throw new NotFoundException(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    const ratings = await this.ratingRepository.find({
      where: {
        member: { memberId } as Member,
      },
      order: {
        ratingId: 'DESC',
      },
      skip: page * size,
      take: size,
    });

    return ratings.map(RatingResponseDto.from);
  }
}

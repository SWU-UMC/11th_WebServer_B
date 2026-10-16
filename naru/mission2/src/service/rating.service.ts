import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async getRatingsByMemberId(
    memberId: number,
    page = 0,
    size = 10,
  ): Promise<RatingResponseDto[]> {
    const memberExists = await this.memberService.existsById(memberId);

    if (!memberExists) {
      throw new NotFoundException('Member not found');
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

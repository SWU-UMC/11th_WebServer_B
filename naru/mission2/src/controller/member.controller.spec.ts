import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { MemberController } from './member.controller';
import { MemberService } from '../service/member.service';
import { RatingService } from '../service/rating.service';

describe('MemberController validation', () => {
  const memberService = {
    isNicknameAvailable: jest.fn<MemberService['isNicknameAvailable']>(),
    isEmailAvailable: jest.fn<MemberService['isEmailAvailable']>(),
  };
  const ratingService = { getRatingsByMemberId: jest.fn() };
  const controller = new MemberController(
    memberService as unknown as MemberService,
    ratingService as unknown as RatingService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    memberService.isNicknameAvailable.mockResolvedValue(true);
    memberService.isEmailAvailable.mockResolvedValue(true);
  });

  it.each(['a', 'a'.repeat(13)])(
    'rejects invalid nickname %s before lookup',
    async (value) => {
      await expect(controller.checkNickname(value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(memberService.isNicknameAvailable).not.toHaveBeenCalled();
    },
  );

  it.each(['ab', 'a'.repeat(12)])(
    'accepts nickname boundary %s',
    async (value) => {
      await expect(controller.checkNickname(value)).resolves.toEqual({
        available: true,
      });
      expect(memberService.isNicknameAvailable).toHaveBeenCalledWith(value);
    },
  );

  it('preserves duplicate nickname response', async () => {
    memberService.isNicknameAvailable.mockResolvedValue(false);
    await expect(controller.checkNickname('수현')).resolves.toEqual({
      available: false,
    });
  });

  it.each([
    'invalid-email',
    'test@',
    'a..b@umc.com',
    'test@-umc.com',
    'test@umc..com',
    'test @umc.com',
  ])('rejects invalid email %s before lookup', async (value) => {
    await expect(controller.checkEmail(value)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(memberService.isEmailAvailable).not.toHaveBeenCalled();
  });

  it.each(['test@umc.com', 'test+movie@sub.umc.com'])(
    'accepts email %s',
    async (value) => {
      await expect(controller.checkEmail(value)).resolves.toEqual({
        available: true,
      });
      expect(memberService.isEmailAvailable).toHaveBeenCalledWith(value);
    },
  );

  it('preserves duplicate email response', async () => {
    memberService.isEmailAvailable.mockResolvedValue(false);
    await expect(controller.checkEmail('noco@umc.com')).resolves.toEqual({
      available: false,
    });
  });

  it('also validates query fallbacks and missing inputs', async () => {
    await expect(
      controller.checkNickname(undefined, 'a'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.checkEmail(undefined, 'test@'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.checkNickname()).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.checkEmail()).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(memberService.isNicknameAvailable).not.toHaveBeenCalled();
    expect(memberService.isEmailAvailable).not.toHaveBeenCalled();
  });
});

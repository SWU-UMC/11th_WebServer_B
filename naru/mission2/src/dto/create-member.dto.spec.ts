import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMemberDto } from './create-member.dto';

describe('CreateMemberDto', () => {
  const valid = {
    email: 'member@example.com',
    nickname: '회원',
    password: 'Abcdef1!',
  };

  it.each(['회원', 'a'.repeat(12)])('accepts nickname %s', async (nickname) => {
    const dto = plainToInstance(CreateMemberDto, { ...valid, nickname });
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each([
    ['email', undefined],
    ['email', null],
    ['email', ''],
    ['email', 'invalid'],
    ['email', 123],
    ['nickname', undefined],
    ['nickname', null],
    ['nickname', ''],
    ['nickname', 'a'],
    ['nickname', 'a'.repeat(13)],
    ['nickname', 123],
    ['password', undefined],
    ['password', null],
    ['password', ''],
    ['password', 'Abcd1!x'],
    ['password', 'abcdef1!'],
    ['password', 'ABCDEF1!'],
    ['password', 'Abcdefg!'],
    ['password', 'Abcdef12'],
    ['password', 'Abcdef1 '],
    ['password', 12345678],
  ])('rejects invalid %s: %s', async (field, value) => {
    const dto = plainToInstance(CreateMemberDto, { ...valid, [field]: value });
    const errors = await validate(dto, { skipMissingProperties: true });
    expect(errors.map((error) => error.property)).toContain(field);
  });
});

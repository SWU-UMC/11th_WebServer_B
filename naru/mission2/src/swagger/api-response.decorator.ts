import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiSuccessResponse(
  status: number,
  message: string,
  model?: Type<unknown>,
  isArray = false,
) {
  const result = model
    ? isArray
      ? { type: 'array', items: { $ref: getSchemaPath(model) } }
      : { $ref: getSchemaPath(model) }
    : { type: 'object', nullable: true, example: null };
  return applyDecorators(
    ...(model ? [ApiExtraModels(model)] : []),
    ApiResponse({
      status,
      description: message,
      schema: {
        type: 'object',
        required: ['isSuccess', 'code', 'message', 'result'],
        properties: {
          isSuccess: { type: 'boolean', example: true },
          code: { type: 'string', example: `COMMON${status}` },
          message: { type: 'string', example: message },
          result,
        },
      },
    }),
  );
}

export function ApiFailureResponse(
  status: number,
  errors: { code: string; message: string }[],
) {
  return ApiResponse({
    status,
    description: errors
      .map((error) => `${error.code}: ${error.message}`)
      .join(' / '),
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['isSuccess', 'code', 'message', 'result'],
          properties: {
            isSuccess: { type: 'boolean', enum: [false] },
            code: { type: 'string' },
            message: { type: 'string' },
            result: { type: 'object', nullable: true, example: null },
          },
        },
        examples: Object.fromEntries(
          errors.map((error) => [
            error.code,
            { value: { isSuccess: false, ...error, result: null } },
          ]),
        ),
      },
    },
  });
}

export function ApiProtectedErrors() {
  return applyDecorators(
    ApiFailureResponse(401, [
      { code: 'AUTH401_2', message: '로그인이 필요한 요청입니다.' },
      { code: 'AUTH401_3', message: '유효하지 않은 토큰입니다.' },
      {
        code: 'AUTH401_4',
        message: '토큰이 만료되었습니다. 다시 로그인해주세요.',
      },
    ]),
    ApiFailureResponse(500, [
      { code: 'COMMON500', message: '서버 오류가 발생했습니다.' },
    ]),
  );
}

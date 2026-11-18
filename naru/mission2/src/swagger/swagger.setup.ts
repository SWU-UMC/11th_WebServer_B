import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('UMC 영화 평점 서비스')
    .setDescription(
      '8주차: 즐겨찾기와 영화 기록 API. 로그인으로 받은 accessToken을 Authorize에 입력하세요. 회원 ID는 토큰에서 식별합니다.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  return document;
}

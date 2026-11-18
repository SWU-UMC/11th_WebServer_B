import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemberController } from './controller/member.controller';
import { RatingController } from './controller/rating.controller';
import { Member } from './entity/member.entity';
import { Rating } from './entity/rating.entity';
import { Favorite } from './entity/favorite.entity';
import { MemberService } from './service/member.service';
import { RatingService } from './service/rating.service';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { AuthGuard } from './guard/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(
            configService.get<string>('JWT_ACCESS_EXPIRATION') ?? 3600,
          ),
        },
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Member, Rating, Favorite]),
  ],
  controllers: [AppController, MemberController, RatingController, AuthController],
  providers: [AppService, MemberService, RatingService, AuthService, AuthGuard],
})
export class AppModule {}

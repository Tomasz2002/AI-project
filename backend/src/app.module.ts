import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { QuizModule } from './quiz/quiz.module';
import { AuthModule } from './auth/auth.module';
import { GameGateway } from './gateways/game.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: `${configService.get('MONGODB_URI')}/${configService.get('DB_NAME')}`,
      }),
    }),
    AuthModule,
    QuizModule,
  ],
  providers: [GameGateway],
})
export class AppModule { }
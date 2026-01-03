import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QuizModule } from './quiz/quiz.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Włączamy obsługę .env globalnie dla całej aplikacji
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Dynamiczne połączenie z MongoDB przy użyciu ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        // To połączenie użyje teraz poprawnej nazwy 'ai-project' z Twojego .env
        uri: `${configService.get('MONGODB_URI')}/${configService.get('DB_NAME')}`,
      }),
    }),
    AuthModule,
    QuizModule,
  ],
})
export class AppModule {}
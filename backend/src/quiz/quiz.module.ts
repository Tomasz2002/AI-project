import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz, QuizSchema } from '../models/quiz.model';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { StudyRoomGateway } from './study-room.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
    HttpModule,
    ConfigModule.forRoot(),
    AuthModule,
  ],
  controllers: [QuizController],
  providers: [
    QuizService,
    StudyRoomGateway,
  ],
})
export class QuizModule {}
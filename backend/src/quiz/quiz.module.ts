// src/quiz/quiz.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz, QuizSchema } from '../models/quiz.model';
import { HttpModule } from '@nestjs/axios'; // <-- NOWY IMPORT
import { ConfigModule } from '@nestjs/config'; // <-- NOWY IMPORT

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
    HttpModule, // <-- DODAJ TO
    ConfigModule.forRoot(), // <-- DODAJ TO
  ],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
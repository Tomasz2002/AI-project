import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizModule } from './quiz/quiz.module';

@Module({
  imports: [
    // ZMIEŃ NAZWĘ BAZY DANYCH TUTAJ:
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/quiz-app'),
    QuizModule,
  ],
})
export class AppModule {}
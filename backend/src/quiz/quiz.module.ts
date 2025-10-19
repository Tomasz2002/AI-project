import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz, QuizSchema } from '../models/quiz.model'; // Upewnij się, że ta ścieżka jest poprawna

@Module({
  imports: [
    // Ta linia jest kluczowa do poprawnego wstrzyknięcia modelu
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
  ],
  controllers: [QuizController],
  providers: [QuizService], // Przywracamy QuizService
})
export class QuizModule {}
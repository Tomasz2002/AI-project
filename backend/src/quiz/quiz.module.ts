import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  // Kontrolery, które należą do tego modułu
  controllers: [QuizController],
  // Serwisy (dostawcy), które będą używane w tym module
  providers: [QuizService],
})
export class QuizModule {}

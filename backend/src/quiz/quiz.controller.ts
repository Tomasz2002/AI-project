import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';

// Wszystkie trasy w tym kontrolerze będą miały prefix /quiz
// Pełna ścieżka do endpointu poniżej to /api/v1/quiz/generate
@Controller('quiz')
export class QuizController {
  // Wstrzykujemy zależność QuizService
  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK) // Zmieniamy domyślny status 201 na 200 dla POST
  async generateQuiz(@Body() createQuizDto: CreateQuizDto) {
    // Przekazujemy dane z zapytania do serwisu, który zajmie się logiką
    console.log('Otrzymano zapytanie z danymi:', createQuizDto);
    return this.quizService.generateQuizFromSources(createQuizDto);
  }
}

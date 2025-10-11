import { Injectable, Logger } from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Injectable()
export class QuizService {
  // Utworzenie loggera do lepszego monitorowania działania serwisu
  private readonly logger = new Logger(QuizService.name);

  async generateQuiz(createQuizDto: CreateQuizDto) {
    this.logger.log('Rozpoczynanie generowania quizu...');
    this.logger.log(`Otrzymane dane: ${JSON.stringify(createQuizDto)}`);

    const { youtubeUrl, questionCount, pages } = createQuizDto;

    // Tutaj znajdzie się cała główna logika aplikacji:
    // 1. Pobranie transkrypcji z YouTube (używając youtubeUrl).
    // 2. Wczytanie i przetworzenie dokumentów (jeśli zostały dodane).
    // 3. Połączenie tekstów i wybranie fragmentów z określonych stron (używając 'pages').
    // 4. Wysłanie zapytania do AI w celu wygenerowania pytań (w ilości 'questionCount').
    // 5. Zwrócenie wygenerowanego quizu.

    // Przykładowa, tymczasowa odpowiedź
    return {
      message: 'Quiz jest w trakcie generowania.',
      params: {
        youtubeUrl,
        questionCount,
        selectedPages: pages, // Bezpiecznie odwołujemy się do 'pages'
      },
      // W przyszłości tutaj znajdą się pytania:
      // questions: [...]
    };
  }
}


import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Quiz, IQuiz } from '../models/quiz.model';
import { GenerateQuizDto } from './dto/generate-quiz.dto';

// Prosty magazyn w pamięci do tymczasowego przechowywania danych między krokami formularza.
const sessionStore = new Map<string, { file: Express.Multer.File, youtubeUrl: string }>();

@Injectable()
export class QuizService {
  constructor(@InjectModel(Quiz.name) private quizModel: Model<IQuiz>) {}

  /**
   * Znajduje quiz w bazie danych na podstawie jego ID.
   * Zawiera walidację formatu ID.
   * @param id - ID quizu do znalezienia.
   * @returns Znaleziony dokument quizu lub null.
   */
  async findById(id: string): Promise<IQuiz | null> {
    // Krok 1: Sprawdź, czy podane ID ma poprawny format MongoDB ObjectId.
    if (!isValidObjectId(id)) {
      console.error(`[Service Error] Nieprawidłowy format ID: ${id}`);
      // Rzucenie błędu tutaj zostanie złapane przez blok try...catch w kontrolerze.
      throw new BadRequestException('Nieprawidłowy format ID.');
    }
    
    // Krok 2: Wyszukaj dokument w bazie danych.
    return this.quizModel.findById(id).exec();
  }

  /**
   * Obsługuje przesłany plik i link (Krok 1 formularza).
   * Zapisuje dane tymczasowo w pamięci i zwraca unikalne ID sesji.
   */
  async handleFileUpload(file: Express.Multer.File, youtubeUrl: string): Promise<string> {
    const sessionId = uuidv4();
    sessionStore.set(sessionId, { file, youtubeUrl });
    console.log(`[Session ${sessionId}] Plik ${file.originalname} i URL zostały zapisane tymczasowo.`);
    return sessionId;
  }

  /**
   * Tworzy nowy dokument quizu w bazie danych (Krok 2 formularza).
   */
  async createQuiz(generateQuizDto: GenerateQuizDto): Promise<IQuiz> {
    const { sessionId, pageFrom, pageTo, quizCount, questionsToUnlock } = generateQuizDto;

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new NotFoundException('Nie znaleziono sesji. Prześlij materiały ponownie.');
    }

    // TODO: Tutaj w przyszłości umieścisz logikę generowania pytań przez AI.
    // Poniżej znajdują się przykładowe, statyczne dane na potrzeby demonstracji.
    const generatedQuizzesExample = [{
        timestamp: 120,
        questions: [{
            questionText: 'To jest przykładowe pytanie wygenerowane z dokumentu.',
            options: ['Odp A', 'Odp B', 'Odp C'],
            correctAnswer: 'Odp B',
        }],
    }];

    const newQuiz = new this.quizModel({
      youtubeUrl: sessionData.youtubeUrl,
      youtubeVideoId: 'pending', // TODO: Wyodrębnij ID z URL
      documentFileName: sessionData.file.originalname,
      documentFilePath: sessionData.file.path, // Ścieżka, jeśli zapisujesz plik na dysku
      pageFrom,
      pageTo,
      quizQuestionCount: quizCount,
      questionsToUnlock,
      generatedQuizzes: generatedQuizzesExample,
    });

    // Usuń dane sesji po ich wykorzystaniu, aby nie zaśmiecać pamięci.
    sessionStore.delete(sessionId);

    return newQuiz.save();
  }
}
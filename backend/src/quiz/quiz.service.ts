import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Quiz, IQuiz } from '../models/quiz.model';
import { GenerateQuizDto } from './dto/generate-quiz.dto';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { PDFDocument } from 'pdf-lib';
// tslint:disable-next-line:no-var-requires
const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import * as path from 'path';

// Magazyn w pamięci dla tymczasowych sesji przesyłania plików
const sessionStore = new Map<string, { file: Express.Multer.File, youtubeUrl: string }>();

@Injectable()
export class QuizService {
  private readonly YOUTUBE_API_KEY: string;

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<IQuiz>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.YOUTUBE_API_KEY = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!this.YOUTUBE_API_KEY) {
      console.error('BŁĄD KRYTYCZNY: Brak klucza YOUTUBE_API_KEY w .env');
    }
  }

  /**
   * Znajduje konkretny quiz po ID.
   */
  async findById(id: string): Promise<IQuiz | null> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Nieprawidłowy format ID.');
    }
    return this.quizModel.findById(id).exec();
  }

  /**
   * Pobiera wszystkie quizy należące do danego użytkownika.
   */
  async findAllByUser(userId: string): Promise<IQuiz[]> {
    return this.quizModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Obsługuje pierwszy krok formularza - zapisuje plik i URL w tymczasowej sesji.
   */
  async handleFileUpload(file: Express.Multer.File, youtubeUrl: string): Promise<string> {
    const sessionId = uuidv4();
    sessionStore.set(sessionId, { file, youtubeUrl });
    return sessionId;
  }

  /**
   * Krok 2: Generuje quiz, wyodrębnia tekst z PDF, pobiera czas filmu i zapisuje w bazie.
   */
  async createQuiz(generateQuizDto: GenerateQuizDto, userId: string): Promise<IQuiz> {
    const { sessionId, pageFrom, pageTo, quizCount, questionsToUnlock } = generateQuizDto;

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new NotFoundException('Nie znaleziono sesji. Prześlij materiały ponownie.');
    }

    const fileBuffer = sessionData.file.buffer;
    if (!fileBuffer) {
      sessionStore.delete(sessionId);
      throw new BadRequestException('Błąd odczytu pliku.');
    }

    // Wyodrębnianie tekstu z PDF (tylko wskazane strony)
    let extractedText = ''; 
    if (sessionData.file.mimetype === 'application/pdf') {
      extractedText = await this.extractTextFromPdfPages(fileBuffer, pageFrom, pageTo);
    } else {
      sessionStore.delete(sessionId);
      throw new BadRequestException('Obsługiwane są tylko pliki PDF.');
    }

    // Zapisywanie pliku na dysku serwera
    const newFileName = `${uuidv4()}-${sessionData.file.originalname}`;
    const permanentPath = path.join(__dirname, '..', '..', '..', 'uploads', 'documents', newFileName);

    try {
      await fs.mkdir(path.dirname(permanentPath), { recursive: true });
      await fs.writeFile(permanentPath, fileBuffer); 
    } catch (error) {
      sessionStore.delete(sessionId);
      throw new BadRequestException('Nie udało się zapisać pliku na serwerze.');
    }

    // Pobieranie danych z YouTube API
    const videoId = this.extractVideoId(sessionData.youtubeUrl);
    let videoDurationInSeconds: number;
    try {
      videoDurationInSeconds = await this._getYoutubeVideoDuration(videoId);
    } catch (error) {
      sessionStore.delete(sessionId); 
      throw new BadRequestException(`Błąd YouTube: ${error.message}`);
    }

    // Generowanie placeholderów pytań
    const dynamicQuizzes = this._generateDynamicQuizzes(quizCount, videoDurationInSeconds);

    const newQuiz = new this.quizModel({
      userId, // Powiązanie z zalogowanym użytkownikiem
      youtubeUrl: sessionData.youtubeUrl,
      youtubeVideoId: videoId,
      youtubeVideoDurationSeconds: videoDurationInSeconds, 
      documentFileName: sessionData.file.originalname,
      documentFilePath: permanentPath, 
      pageFrom,
      pageTo,
      quizQuestionCount: quizCount,
      questionsToUnlock,
      generatedQuizzes: dynamicQuizzes,
      completedQuestions: [], // Inicjalizacja pustego postępu
    });

    sessionStore.delete(sessionId);
    return newQuiz.save();
  }

  /**
   * Aktualizuje postęp użytkownika (rozwiązane pytania).
   */
  async updateProgress(quizId: string, completedQuestionIds: string[]): Promise<IQuiz> {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundException('Quiz nie istnieje.');

    // Łączenie postępu bez duplikatów
    const updatedProgress = Array.from(new Set([...quiz.completedQuestions, ...completedQuestionIds]));
    quiz.completedQuestions = updatedProgress;
    
    return quiz.save();
  }

  // --- Metody Pomocnicze (Analiza PDF, YouTube, Quizy) ---

  private async extractTextFromPdfPages(fileBuffer: Buffer, from: number, to: number): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      if (from < 1 || to > totalPages || from > to) {
        throw new BadRequestException(`Nieprawidłowy zakres stron (1-${totalPages}).`);
      }

      const newDoc = await PDFDocument.create();
      for (let i = from - 1; i < to; i++) {
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
        newDoc.addPage(copiedPage);
      }
      
      const newPdfBytes = await newDoc.save();
      const data = await pdfParse(newPdfBytes);
      return data.text; 
    } catch (error) {
      if (error instanceof BadRequestException) throw error; 
      throw new BadRequestException('Błąd przetwarzania PDF.');
    }
  }

private async _getYoutubeVideoDuration(videoId: string): Promise<number> {
  const url = 'https://www.googleapis.com/youtube/v3/videos';
  const params = { 
    part: 'contentDetails', 
    id: videoId, 
    key: this.YOUTUBE_API_KEY 
  };

  try {
    const response = await firstValueFrom(this.httpService.get(url, { params }));
    const data = response.data;
    
    if (!data.items || data.items.length === 0) {
      throw new NotFoundException(`Nie znaleziono filmu o ID: ${videoId}`);
    }
    
    return this._parseISO8601Duration(data.items[0].contentDetails.duration);
  } catch (error) {
    // Wypisuje szczegóły błędu w terminalu backendu:
    console.error('❌ SZCZEGÓŁY BŁĘDU YOUTUBE API:', error.response?.data || error.message);
    
    // Zwraca bardziej szczegółowy opis do frontendu:
    const detail = error.response?.data?.error?.message || 'Błąd połączenia z API Google';
    throw new BadRequestException(`Błąd YouTube API: ${detail}`);
  }
}

  private _parseISO8601Duration(durationString: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationString.match(regex);
    if (!matches) return 0;
    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);
    return (hours * 3600) + (minutes * 60) + seconds;
  }

  private _formatSecondsToMMSS(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private _generateDynamicQuizzes(totalQuestions: number, videoDurationSeconds: number): any[] {
    const quizzes = [];
    const maxQuestionsPerGroup = 5;
    const numGroups = Math.ceil(totalQuestions / maxQuestionsPerGroup);
    const interval = videoDurationSeconds / (numGroups + 1);
    
    let questionCounter = 1;
    for (let i = 1; i <= numGroups; i++) {
      if (questionCounter > totalQuestions) break;
      const timestamp = Math.floor(interval * i);
      const questionsInGroup = Math.min(maxQuestionsPerGroup, totalQuestions - questionCounter + 1);
      
      const questions = [];
      for (let j = 0; j < questionsInGroup; j++) {
        questions.push({
          questionText: `[PLACEHOLDER] Pytanie ${questionCounter}`,
          options: ['A', 'B', 'Poprawna', 'D'],
          correctAnswer: 'Poprawna',
        });
        questionCounter++;
      }

      quizzes.push({
        timestamp,
        timestampFormatted: this._formatSecondsToMMSS(timestamp),
        questions,
      });
    }
    return quizzes;
  }

  private extractVideoId(url: string): string {
    const regex = /(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/;
    return url.match(regex)?.[1] || 'ID_NOT_FOUND';
  }
}
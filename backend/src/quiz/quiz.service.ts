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

// Integracja z Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";

import { PDFDocument } from 'pdf-lib';
// tslint:disable-next-line:no-var-requires
const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import * as path from 'path';

const sessionStore = new Map<string, { file: Express.Multer.File, youtubeUrl: string }>();

@Injectable()
export class QuizService {
  private readonly YOUTUBE_API_KEY: string;
  private genAI: GoogleGenerativeAI;
  private aiModel: any;

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<IQuiz>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.YOUTUBE_API_KEY = this.configService.get<string>('YOUTUBE_API_KEY');
    
    // Inicjalizacja Gemini API
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
    console.log('✅ Klucz Gemini został poprawnie załadowany z .env');
    // Dla bezpieczeństwa nie wypisuj całego klucza, tylko pierwsze 4 znaki:
    console.log('Początek klucza:', geminiKey.substring(0, 4) + '****');
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.aiModel = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" } // Wymuszamy JSON
      });
    } else {
      console.error('BŁĄD: Brak klucza GEMINI_API_KEY w .env');
    }
  }

  async findById(id: string): Promise<IQuiz | null> {
    if (!isValidObjectId(id)) throw new BadRequestException('Nieprawidłowy format ID.');
    return this.quizModel.findById(id).exec();
  }

  async findAllByUser(userId: string): Promise<IQuiz[]> {
    return this.quizModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async handleFileUpload(file: Express.Multer.File, youtubeUrl: string): Promise<string> {
    const sessionId = uuidv4();
    sessionStore.set(sessionId, { file, youtubeUrl });
    return sessionId;
  }

  /**
   * Główna funkcja tworzenia quizu z wykorzystaniem AI
   */
  async createQuiz(generateQuizDto: GenerateQuizDto, userId: string): Promise<IQuiz> {
    const { sessionId, pageFrom, pageTo, quizCount, questionsToUnlock } = generateQuizDto;

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) throw new NotFoundException('Sesja wygasła.');

    // 1. Wyodrębnianie tekstu z PDF
    let extractedText = ''; 
    if (sessionData.file.mimetype === 'application/pdf') {
      extractedText = await this.extractTextFromPdfPages(sessionData.file.buffer, pageFrom, pageTo);
    } else {
      throw new BadRequestException('Obsługiwane są tylko pliki PDF.');
    }
    console.log('--- TEST WYODRĘBNIONEGO TEKSTU ---');
    console.log('Długość tekstu:', extractedText.length);
    console.log('Pierwsze 200 znaków:', extractedText.substring(0, 200));
    console.log('---------------------------------');
    // 2. Zapis pliku na dysku
    const newFileName = `${uuidv4()}-${sessionData.file.originalname}`;
    const permanentPath = path.join(__dirname, '..', '..', '..', 'uploads', 'documents', newFileName);
    await fs.mkdir(path.dirname(permanentPath), { recursive: true });
    await fs.writeFile(permanentPath, sessionData.file.buffer);

    // 3. Pobieranie długości filmu YouTube
    const videoId = this.extractVideoId(sessionData.youtubeUrl);
    const videoDuration = await this._getYoutubeVideoDuration(videoId);

    // 4. GENEROWANIE PYTAŃ PRZEZ AI (ZAMIAST PLACEHOLDERÓW)
    let generatedQuizzes = [];
    try {
      generatedQuizzes = await this._generateQuizzesWithAI(extractedText, quizCount, videoDuration);
    } catch (error) {
      console.error("AI Error, falling back to placeholders:", error);
      generatedQuizzes = this._generatePlaceholderQuizzes(quizCount, videoDuration);
    }

    // 5. Zapis do bazy danych
    const newQuiz = new this.quizModel({
      userId,
      youtubeUrl: sessionData.youtubeUrl,
      youtubeVideoId: videoId,
      youtubeVideoDurationSeconds: videoDuration, 
      documentFileName: sessionData.file.originalname,
      documentFilePath: permanentPath, 
      pageFrom,
      pageTo,
      quizQuestionCount: quizCount,
      questionsToUnlock,
      generatedQuizzes: generatedQuizzes,
      completedQuestions: [],
    });

    sessionStore.delete(sessionId);
    return newQuiz.save();
  }

  /**
   * KOMUNIKACJA Z GEMINI AI
   */
  private async _generateQuizzesWithAI(text: string, count: number, duration: number): Promise<any[]> {
    const prompt = `
      Jesteś ekspertem edukacyjnym. Na podstawie dostarczonego tekstu z notatek PDF, wygeneruj ${count} pytań testowych.
      Pytania muszą być merytoryczne i ściśle powiązane z tekstem.
      Rozmieść te pytania w czasie trwania filmu (całkowity czas filmu to ${duration} sekund).
      
      NOTATKI PDF:
      ${text.substring(0, 10000)} // Limit tekstu dla stabilności

      Zwróć odpowiedź WYŁĄCZNIE jako JSON w formacie:
      [
        {
          "timestamp": liczba_sekund,
          "timestampFormatted": "MM:SS",
          "questions": [
            {
              "questionText": "Treść pytania?",
              "options": ["Opcja A", "Opcja B", "Opcja C", "Opcja D"],
              "correctAnswer": "Dokładna treść poprawnej odpowiedzi"
            }
          ]
        }
      ]
      Zasada: Jeśli pytań jest dużo, pogrupuj je po max 3 na jeden timestamp.
    `;

    const result = await this.aiModel.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  }

  async updateProgress(quizId: string, completedQuestionIds: string[]): Promise<IQuiz> {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundException('Quiz nie istnieje.');
    quiz.completedQuestions = Array.from(new Set([...quiz.completedQuestions, ...completedQuestionIds]));
    return quiz.save();
  }

  // --- METODY POMOCNICZE ---

  private async extractTextFromPdfPages(fileBuffer: Buffer, from: number, to: number): Promise<string> {
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const totalPages = pdfDoc.getPageCount();
    if (from < 1 || to > totalPages || from > to) throw new BadRequestException('Błędny zakres stron.');

    const newDoc = await PDFDocument.create();
    for (let i = from - 1; i < to; i++) {
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(copiedPage);
    }
    const data = await pdfParse(await newDoc.save());
    return data.text;
  }

  private async _getYoutubeVideoDuration(videoId: string): Promise<number> {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const params = { part: 'contentDetails', id: videoId, key: this.YOUTUBE_API_KEY };
    try {
      const response = await firstValueFrom(this.httpService.get(url, { params }));
      if (!response.data.items?.length) throw new Error('Video not found');
      return this._parseISO8601Duration(response.data.items[0].contentDetails.duration);
    } catch (e) {
      throw new BadRequestException('YouTube API Error');
    }
  }

  private _parseISO8601Duration(duration: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);
    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private extractVideoId(url: string): string {
    const regex = /(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/;
    return url.match(regex)?.[1] || 'ID_NOT_FOUND';
  }

  private _generatePlaceholderQuizzes(count: number, duration: number): any[] {
    // Funkcja awaryjna, gdyby AI nie odpowiedziało
    return [{
      timestamp: Math.floor(duration / 2),
      timestampFormatted: "00:30",
      questions: [{
        questionText: "Błąd generowania AI. To jest pytanie zastępcze.",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A"
      }]
    }];
  }
}
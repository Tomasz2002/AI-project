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

// Import Google Generative AI
import { GoogleGenerativeAI } from '@google/generative-ai';

// Magazyn w pamięci dla tymczasowych sesji przesyłania plików
const sessionStore = new Map<string, { file: Express.Multer.File, youtubeUrl: string }>();

@Injectable()
export class QuizService {
  private readonly YOUTUBE_API_KEY: string;
  private readonly GEMINI_API_KEY: string;
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<IQuiz>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.YOUTUBE_API_KEY = this.configService.get<string>('YOUTUBE_API_KEY');
    this.GEMINI_API_KEY = this.configService.get<string>('GEMINI_API_KEY');

    if (!this.YOUTUBE_API_KEY) {
      console.error('BŁĄD KRYTYCZNY: Brak klucza YOUTUBE_API_KEY w .env');
    }
    
    if (!this.GEMINI_API_KEY) {
      console.error('BŁĄD KRYTYCZNY: Brak klucza GEMINI_API_KEY w .env');
    } else {
      // Inicjalizacja Gemini
      this.genAI = new GoogleGenerativeAI(this.GEMINI_API_KEY);
      console.log('✅ Gemini SDK zainicjalizowane.');
      this.listAvailableModels();
    }
  }

  /**
   * Diagnostyka: Wyświetla listę modeli (v1) w konsoli przy starcie.
   */
  private async listAvailableModels() {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${this.GEMINI_API_KEY}`;
      const response = await firstValueFrom(this.httpService.get(url));
      console.log('--- DOSTĘPNE MODELE DLA TWOJEGO KLUCZA ---');
      if (response.data && response.data.models) {
        response.data.models.forEach((m: any) => console.log(`- ${m.name}`));
      }
      console.log('------------------------------------------');
    } catch (err: any) {
      console.warn('⚠️ Diagnostyka: Nie udało się pobrać listy modeli.');
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

  async createQuiz(generateQuizDto: GenerateQuizDto, userId: string): Promise<IQuiz> {
    const { sessionId, pageFrom, pageTo, quizCount, questionsToUnlock } = generateQuizDto;

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) throw new NotFoundException('Nie znaleziono sesji.');

    const fileBuffer = sessionData.file.buffer;
    if (!fileBuffer) throw new BadRequestException('Błąd odczytu pliku.');

    // 1. Wyodrębnianie tekstu z PDF
    let extractedText = ''; 
    if (sessionData.file.mimetype === 'application/pdf') {
      extractedText = await this.extractTextFromPdfPages(fileBuffer, pageFrom, pageTo);
    } else {
      throw new BadRequestException('Obsługiwane są tylko pliki PDF.');
    }

    // 2. Generowanie pytań przez AI (Zaktualizowane modele)
    let aiQuestions = [];
    try {
      console.log(`--- Generowanie ${quizCount} pytań przez AI (Gemini 2.0) ---`);
      aiQuestions = await this._generateQuestionsWithGemini(extractedText, quizCount);
      console.log(`✅ AI pomyślnie wygenerowało pytania.`);
    } catch (error: any) {
      console.error('❌ BŁĄD KRYTYCZNY AI:', error.message);
      // Fallback
      aiQuestions = Array.from({ length: quizCount }, (_, i) => ({
        questionText: `[Błąd AI] Pytanie zapasowe ${i + 1}`,
        options: ['A', 'B', 'Poprawna', 'D'],
        correctAnswer: 'Poprawna',
      }));
    }

    // 3. Zapis pliku
    const newFileName = `${uuidv4()}-${sessionData.file.originalname}`;
    const permanentPath = path.join(__dirname, '..', '..', '..', 'uploads', 'documents', newFileName);
    await fs.mkdir(path.dirname(permanentPath), { recursive: true });
    await fs.writeFile(permanentPath, fileBuffer);

    // 4. YouTube
    const videoId = this.extractVideoId(sessionData.youtubeUrl);
    const videoDuration = await this._getYoutubeVideoDuration(videoId);

    // 5. Zapis w DB
    const newQuiz = new this.quizModel({
      userId,
      youtubeUrl: sessionData.youtubeUrl,
      youtubeVideoId: videoId,
      youtubeVideoDurationSeconds: videoDuration, 
      documentFileName: sessionData.file.originalname,
      documentFilePath: permanentPath, 
      pageFrom, pageTo,
      quizQuestionCount: quizCount,
      questionsToUnlock,
      generatedQuizzes: this._distributeQuestionsOnTimeline(aiQuestions, videoDuration),
      completedQuestions: [],
    });

    sessionStore.delete(sessionId);
    return newQuiz.save();
  }

  /**
   * Zaktualizowana metoda: Używa modeli gemini-2.0-flash i gemini-2.0-flash-lite
   */
  private async _generateQuestionsWithGemini(text: string, count: number): Promise<any[]> {
    const prompt = `
      Na podstawie poniższych notatek przygotuj dokładnie ${count} pytań testowych wielokrotnego wyboru.
      Każde pytanie musi mieć dokładnie 4 opcje i tylko jedną poprawną.
      Wynik zwróć wyłącznie jako tablicę JSON.

      FORMAT:
      [{"questionText": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]

      NOTATKI:
      ${text.substring(0, 20000)}
    `;

    // Modele pobrane z Twojej diagnostyki
    const modelOptions = [
      'gemini-2.0-flash', 
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash'
    ];

    let lastError: any;

    for (const modelName of modelOptions) {
      try {
        console.log(`Próba z modelem: ${modelName}...`);
        
        // Próbujemy najpierw przez stabilny endpoint v1 (bezpośrednio axios) dla pewności
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.GEMINI_API_KEY}`;
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const response = await firstValueFrom(this.httpService.post(url, payload));
        const jsonText = response.data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
        
      } catch (err: any) {
        console.warn(`❌ Model ${modelName} nie odpowiedział poprawnie: ${err.message}`);
        
        // Próba przez SDK jako fallback dla danej nazwy modelu
        try {
          const sdkModel = this.genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json' } });
          const result = await sdkModel.generateContent(prompt);
          return JSON.parse(result.response.text());
        } catch (sdkErr) {
          lastError = sdkErr;
        }
      }
    }

    throw lastError;
  }

  private _distributeQuestionsOnTimeline(allQuestions: any[], videoDuration: number): any[] {
    const quizzes = [];
    const maxPerGroup = 5;
    const numGroups = Math.ceil(allQuestions.length / maxPerGroup);
    const interval = videoDuration / (numGroups + 1);

    for (let i = 0; i < numGroups; i++) {
      const timestamp = Math.floor(interval * (i + 1));
      quizzes.push({
        timestamp,
        timestampFormatted: this._formatSecondsToMMSS(timestamp),
        questions: allQuestions.slice(i * maxPerGroup, (i + 1) * maxPerGroup),
      });
    }
    return quizzes;
  }

  private async extractTextFromPdfPages(fileBuffer: Buffer, from: number, to: number): Promise<string> {
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const newDoc = await PDFDocument.create();
    for (let i = from - 1; i < Math.min(to, pdfDoc.getPageCount()); i++) {
      const [page] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(page);
    }
    const data = await pdfParse(Buffer.from(await newDoc.save()));
    return data.text;
  }

  private async _getYoutubeVideoDuration(videoId: string): Promise<number> {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const params = { part: 'contentDetails', id: videoId, key: this.YOUTUBE_API_KEY };
    const response = await firstValueFrom(this.httpService.get(url, { params }));
    const duration = response.data.items?.[0]?.contentDetails?.duration || 'PT0S';
    return this._parseISO8601Duration(duration);
  }

  private _parseISO8601Duration(duration: string): number {
    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    return (parseInt(matches[1] || '0') * 3600) + (parseInt(matches[2] || '0') * 60) + parseInt(matches[3] || '0');
  }

  private _formatSecondsToMMSS(s: number): string {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  private extractVideoId(url: string): string {
    return url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)?.[1] || 'ID_NOT_FOUND';
  }

  async updateProgress(quizId: string, completedIds: string[]): Promise<IQuiz> {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundException('Brak quizu.');
    quiz.completedQuestions = Array.from(new Set([...quiz.completedQuestions, ...completedIds]));
    return quiz.save();
  }
}
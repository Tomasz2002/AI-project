import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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
import { GoogleGenerativeAI } from '@google/generative-ai';

const sessionStore = new Map<string, { file: Express.Multer.File; youtubeUrl: string }>();

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

    if (this.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(this.GEMINI_API_KEY);
      this.checkAvailableModels();
    }
  }

  async checkAvailableModels() {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.GEMINI_API_KEY}`;
      const response = await firstValueFrom(this.httpService.get(url));
      console.log('--- DOSTĘPNE MODELE DLA TWOJEGO KLUCZA ---');
      const models = response.data.models.map((m: any) => m.name.replace('models/', ''));
      console.log(models);
      console.log('------------------------------------------');
    } catch (error) {
      console.error('Błąd diagnostyki:', error.message);
    }
  }

  async findById(id: string): Promise<IQuiz | null> {
    if (!isValidObjectId(id)) throw new BadRequestException('Nieprawidłowy format ID.');
    return this.quizModel.findById(id).exec();
  }

  async findAllByUser(userId: string): Promise<IQuiz[]> {
    return this.quizModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async deleteQuiz(quizId: string, userId: string): Promise<void> {
    const quiz = await this.quizModel.findOne({ _id: quizId, userId }).exec();
    if (!quiz) throw new NotFoundException('Sesja nie istnieje.');

    if (quiz.documentFilePath) {
      try { await fs.unlink(quiz.documentFilePath); } catch (err) {}
    }
    await this.quizModel.deleteOne({ _id: quizId }).exec();
  }

  async handleFileUpload(file: Express.Multer.File, youtubeUrl: string): Promise<string> {
    const sessionId = uuidv4();
    sessionStore.set(sessionId, { file, youtubeUrl });
    return sessionId;
  }

  async createQuiz(generateQuizDto: GenerateQuizDto, userId: string): Promise<IQuiz> {
    const { sessionId, pageFrom, pageTo, quizCount, questionsToUnlock } = generateQuizDto;
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) throw new NotFoundException('Sesja wygasła.');

    const extractedText = await this.extractTextFromPdfPages(sessionData.file.buffer, pageFrom, pageTo);

    let aiQuestions = [];
    try {
      aiQuestions = await this._generateQuestionsWithGemini(extractedText, quizCount);
    } catch (error) {
      console.warn('Uruchomiono tryb awaryjny (AI Fallback).');
      aiQuestions = Array.from({ length: quizCount }, (_, i) => ({
        questionText: `[Pytanie zapasowe] Treść niedostępna ze względu na przeciążenie AI.`,
        options: ['Opcja A', 'Opcja B', 'Poprawna', 'Opcja D'],
        correctAnswer: 'Poprawna',
      }));
    }

    const newFileName = `${uuidv4()}-${sessionData.file.originalname}`;
    const permanentPath = path.join(__dirname, '..', '..', '..', 'uploads', 'documents', newFileName);
    await fs.mkdir(path.dirname(permanentPath), { recursive: true });
    await fs.writeFile(permanentPath, sessionData.file.buffer);

    const videoId = this.extractVideoId(sessionData.youtubeUrl);
    const videoDuration = await this._getYoutubeVideoDuration(videoId);

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
   * Zaktualizowana metoda generowania:
   * Próbuje po kolei modeli Gemini 2.5, 2.0 i wersji Lite.
   */
  private async _generateQuestionsWithGemini(text: string, count: number): Promise<any[]> {
    // Lista modeli w kolejności od najbardziej pożądanego (z Twojej listy)
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite'
    ];

    const prompt = `Jesteś ekspertem. Na podstawie tekstu przygotuj dokładnie ${count} pytań testowych JSON: 
    [{"questionText": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]
    Tekst: ${text.substring(0, 15000)}`;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Próba generowania przez model: ${modelName}...`);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
      } catch (error: any) {
        const status = error.status || error.response?.status;
        
        if (status === 429) {
          console.warn(`⚠️ Model ${modelName}: Przekroczono limit zapytań (Quota exceeded).`);
        } else if (status === 503 || error.message?.includes('overloaded')) {
          console.warn(`⚠️ Model ${modelName}: Serwery są obecnie przeciążone.`);
        } else if (status === 404) {
          console.warn(`⚠️ Model ${modelName}: Nie znaleziono modelu (404).`);
        } else {
          console.error(`❌ Model ${modelName}: Nieznany błąd: ${error.message}`);
        }
        // Kontynuuj pętlę do następnego modelu
      }
    }

    // Jeśli pętla się skończy i nic nie zadziałało
    throw new InternalServerErrorException('Wszystkie dostępne modele AI są obecnie przeciążone lub niedostępne.');
  }

  private _distributeQuestionsOnTimeline(allQuestions: any[], duration: number): any[] {
    const quizzes = [];
    const interval = duration / (Math.ceil(allQuestions.length / 5) + 1);
    for (let i = 0; i < Math.ceil(allQuestions.length / 5); i++) {
      const ts = Math.floor(interval * (i + 1));
      quizzes.push({
        timestamp: ts,
        timestampFormatted: `${Math.floor(ts / 60)}:${(ts % 60).toString().padStart(2, '0')}`,
        questions: allQuestions.slice(i * 5, (i + 1) * 5),
      });
    }
    return quizzes;
  }

  private async extractTextFromPdfPages(buffer: Buffer, from: number, to: number): Promise<string> {
    const pdfDoc = await PDFDocument.load(buffer);
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
    const res = await firstValueFrom(this.httpService.get(url, { params }));
    const match = res.data.items[0].contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
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
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
const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Magazyn tymczasowy na czas przesyłania plików
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
    if (this.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(this.GEMINI_API_KEY);
    }
  }

  // --- Zarządzanie sesjami ---

  async findById(id: string): Promise<IQuiz | null> {
    if (!isValidObjectId(id)) throw new BadRequestException('Nieprawidłowe ID.');
    return this.quizModel.findById(id).exec();
  }

  async findAllByUser(userId: string): Promise<IQuiz[]> {
    return this.quizModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async deleteQuiz(quizId: string, userId: string): Promise<void> {
    const quiz = await this.quizModel.findOne({ _id: quizId, userId }).exec();
    if (!quiz) throw new NotFoundException('Nie znaleziono sesji.');

    if (quiz.documentFilePath) {
      try { await fs.unlink(quiz.documentFilePath); } catch (e) {}
    }
    await this.quizModel.deleteOne({ _id: quizId }).exec();
  }

  // --- Proces tworzenia quizu ---

  async handleFileUpload(file: Express.Multer.File, youtubeUrl: string): Promise<string> {
    const sessionId = uuidv4();
    sessionStore.set(sessionId, { file, youtubeUrl });
    return sessionId;
  }

  async createQuiz(dto: GenerateQuizDto, userId: string): Promise<IQuiz> {
    const sessionData = sessionStore.get(dto.sessionId);
    if (!sessionData) throw new NotFoundException('Sesja wygasła.');

    const text = await this.extractTextFromPdfPages(sessionData.file.buffer, dto.pageFrom, dto.pageTo);
    
    let aiQuestions;
    try {
      aiQuestions = await this._generateQuestionsWithGemini(text, dto.quizCount);
    } catch (error) {
      // Fallback w razie błędu AI
      aiQuestions = Array.from({ length: dto.quizCount }, (_, i) => ({
        questionText: `[Błąd AI] Pytanie zapasowe ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'C',
      }));
    }

    const fileName = `${uuidv4()}-${sessionData.file.originalname}`;
    const filePath = path.join(__dirname, '..', '..', '..', 'uploads', 'documents', fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, sessionData.file.buffer);

    const videoId = this.extractVideoId(sessionData.youtubeUrl);
    const duration = await this._getYoutubeVideoDuration(videoId);

    const newQuiz = new this.quizModel({
      userId,
      youtubeUrl: sessionData.youtubeUrl,
      youtubeVideoId: videoId,
      youtubeVideoDurationSeconds: duration,
      documentFileName: sessionData.file.originalname,
      documentFilePath: filePath,
      pageFrom: dto.pageFrom, 
      pageTo: dto.pageTo,
      quizQuestionCount: dto.quizCount,
      questionsToUnlock: dto.questionsToUnlock,
      generatedQuizzes: this._distributeQuestionsOnTimeline(aiQuestions, duration),
      completedQuestions: [],
    });

    sessionStore.delete(dto.sessionId);
    return newQuiz.save();
  }

  // --- Integracja AI ---

  private async _generateQuestionsWithGemini(text: string, count: number): Promise<any[]> {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash', 
      generationConfig: { responseMimeType: 'application/json' } 
    });

    const prompt = `Na podstawie notatek stwórz ${count} pytań testowych JSON: [{"questionText": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}] \n\n TEKST: ${text.substring(0, 15000)}`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }

  // --- Pomocnicze ---

  private _distributeQuestionsOnTimeline(allQs: any[], duration: number): any[] {
    const quizzes = [];
    const groups = Math.ceil(allQs.length / 5);
    const interval = duration / (groups + 1);
    for (let i = 0; i < groups; i++) {
      const ts = Math.floor(interval * (i + 1));
      quizzes.push({
        timestamp: ts,
        timestampFormatted: `${Math.floor(ts / 60)}:${(ts % 60).toString().padStart(2, '0')}`,
        questions: allQs.slice(i * 5, (i + 1) * 5),
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
    const d = res.data.items[0].contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    return (parseInt(d[1] || '0') * 3600) + (parseInt(d[2] || '0') * 60) + parseInt(d[3] || '0');
  }

  private extractVideoId(url: string): string {
    return url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)?.[1] || 'ID_NOT_FOUND';
  }

  async updateProgress(quizId: string, completedIds: string[]): Promise<IQuiz> {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundException('Nie znaleziono quizu.');
    quiz.completedQuestions = Array.from(new Set([...quiz.completedQuestions, ...completedIds]));
    return quiz.save();
  }
}
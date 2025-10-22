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

// Prosty magazyn w pamięci
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

  async findById(id: string): Promise<IQuiz | null> {
    if (!isValidObjectId(id)) {
      console.error(`[Service Error] Nieprawidłowy format ID: ${id}`);
      throw new BadRequestException('Nieprawidłowy format ID.');
    }
    return this.quizModel.findById(id).exec();
  }

  async handleFileUpload(file: Express.Multer.File, youtubeUrl: string): Promise<string> {
    const sessionId = uuidv4();
    sessionStore.set(sessionId, { file, youtubeUrl });
    console.log(`[Session ${sessionId}] Plik ${file.originalname} i URL zostały zapisane tymczasowo.`);
    return sessionId;
  }

  async createQuiz(generateQuizDto: GenerateQuizDto): Promise<IQuiz> {
    const { sessionId, pageFrom, pageTo, quizCount, questionsToUnlock } = generateQuizDto;

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new NotFoundException('Nie znaleziono sesji. Prześlij materiały ponownie.');
    }

    const fileBuffer = sessionData.file.buffer;

    if (!fileBuffer) {
        sessionStore.delete(sessionId);
        throw new BadRequestException('Błąd odczytu pliku z sesji. Spróbuj ponownie.');
    }

    let extractedText = ''; 
    
    if (sessionData.file.mimetype === 'application/pdf') {
      try {
        extractedText = await this.extractTextFromPdfPages(
          fileBuffer, 
          pageFrom,
          pageTo
        );
      } catch (error) {
        sessionStore.delete(sessionId);
        throw error; 
      }
    } else {
      sessionStore.delete(sessionId);
      throw new BadRequestException('Na ten moment obsługiwane są tylko pliki PDF.');
    }

    const newFileName = `${uuidv4()}-${sessionData.file.originalname}`;
    const permanentPath = path.join(__dirname, '..', '..', '..', 'uploads', 'documents', newFileName);

    try {
      await fs.mkdir(path.dirname(permanentPath), { recursive: true });
      await fs.writeFile(permanentPath, fileBuffer); 
    } catch (error) {
      console.error('Błąd podczas przenoszenia pliku:', error);
      sessionStore.delete(sessionId);
      throw new BadRequestException('Nie udało się zapisać pliku na serwerze.');
    }

    const videoId = this.extractVideoId(sessionData.youtubeUrl);
    
    let videoDurationInSeconds: number;
    try {
      videoDurationInSeconds = await this._getYoutubeVideoDuration(videoId);
      console.log(`[Session ${sessionId}] Pobrano czas trwania wideo: ${videoDurationInSeconds}s`);
    } catch (error) {
      console.error('Błąd pobierania danych z YouTube API:', error.message);
      sessionStore.delete(sessionId); 
      throw new BadRequestException(`Nie udało się pobrać danych wideo z YouTube. Sprawdź poprawność linku. Błąd: ${error.message}`);
    }

    const dynamicQuizzes = this._generateDynamicQuizzes(quizCount, videoDurationInSeconds);

    const newQuiz = new this.quizModel({
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
    });

    sessionStore.delete(sessionId);
    return newQuiz.save();
  }

  private async extractTextFromPdfPages(fileBuffer: Buffer, from: number, to: number): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);

      const totalPages = pdfDoc.getPageCount();
      if (from < 1 || to > totalPages || from > to) {
        throw new BadRequestException(`Nieprawidłowy zakres stron. Plik ma ${totalPages} stron, zażądano ${from}-${to}.`);
      }

      const newDoc = await PDFDocument.create();
      const indices = [];
      for (let i = from - 1; i < to; i++) {
        indices.push(i);
      }
      
      const copiedPages = await newDoc.copyPages(pdfDoc, indices);
      copiedPages.forEach(page => newDoc.addPage(page));
      
      const newPdfBytes = await newDoc.save();
      
      const data = await pdfParse(newPdfBytes);
      
      return data.text; 

    } catch (error) {
      console.error('Błąd podczas parsowania PDF:', error);
      if (error instanceof BadRequestException) throw error; 
      throw new BadRequestException('Nie udało się przetworzyć pliku PDF.');
    }
  }

  private async _getYoutubeVideoDuration(videoId: string): Promise<number> {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const params = {
      part: 'contentDetails',
      id: videoId,
      key: this.YOUTUBE_API_KEY,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, { params }));
      const data = response.data;

      if (!data.items || data.items.length === 0) {
        throw new NotFoundException('Nie znaleziono wideo o podanym ID.');
      }

      const durationString = data.items[0].contentDetails.duration; // Np. "PT1H5M10S"
      return this._parseISO8601Duration(durationString);
    } catch (error) {
      console.error('Błąd zapytania do YouTube API:', error.response?.data || error.message);
      throw new BadRequestException('Nie udało się pobrać danych z YouTube API.');
    }
  }

  private _parseISO8601Duration(durationString: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationString.match(regex);

    if (!matches) {
      return 0;
    }

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);

    return (hours * 3600) + (minutes * 60) + seconds;
  }

  // --- NOWA METODA POMOCNICZA ---
  /**
   * Konwertuje sekundy na format "M:SS" (np. 272 -> "4:32")
   */
  private _formatSecondsToMMSS(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // padStart(2, '0') zapewnia, że 5 sekund będzie "05", a nie "5"
    const paddedSeconds = seconds.toString().padStart(2, '0');
    
    return `${minutes}:${paddedSeconds}`;
  }

  /**
   * Generuje dynamiczną listę pytań i timestampów (ZMODYFIKOWANA)
   */
  private _generateDynamicQuizzes(totalQuestions: number, videoDurationSeconds: number): any[] {
    const quizzes = [];
    
    // Oblicz liczbę grup quizów. Załóżmy, że chcemy max 5 pytań na grupę
    const maxQuestionsPerGroup = 5;
    const numGroups = Math.ceil(totalQuestions / maxQuestionsPerGroup);

    // Rozdziel timestampy równo w czasie trwania filmu
    const interval = videoDurationSeconds / (numGroups + 1);
    const timestamps = [];
    for (let i = 1; i <= numGroups; i++) {
      timestamps.push(Math.floor(interval * i));
    }
    
    const questionsPerGroup = Math.ceil(totalQuestions / numGroups);
    let questionCounter = 1;

    for (const timestamp of timestamps) {
      if (questionCounter > totalQuestions) break; // Zakończ, jeśli wygenerowano już wszystkie pytania

      const questions = [];
      const questionsInThisGroup = Math.min(questionsPerGroup, totalQuestions - questionCounter + 1);

      for (let j = 0; j < questionsInThisGroup; j++) {
        questions.push({
          questionText: `[PLACEHOLDER] To jest pytanie numer ${questionCounter}`,
          options: [
            'Opcja A (placeholder)',
            'Opcja B (placeholder)',
            'Opcja C (to poprawna odpowiedź)',
            'Opcja D (placeholder)',
          ],
          correctAnswer: 'Opcja C (to poprawna odpowiedź)',
        });
        questionCounter++;
      }

      if (questions.length > 0) {
        // --- MODYFIKACJA TUTAJ ---
        quizzes.push({
          timestamp: timestamp, // np. 272
          timestampFormatted: this._formatSecondsToMMSS(timestamp), // np. "4:32"
          questions: questions,
        });
        // --- KONIEC MODYFIKACJI ---
      }
    }
    
    return quizzes;
  }

  /**
   * Wyciąga ID wideo z różnych formatów linków YouTube.
   */
  private extractVideoId(url: string): string {
    let videoId = 'ID_NOT_FOUND'; // Domyślna wartość
    try {
      const urlObj = new URL(url); // Użyj wbudowanego parsera URL
      
      if (urlObj.hostname.includes('youtube.com')) {
        const params = urlObj.searchParams;
        if (params.has('v')) {
          videoId = params.get('v');
        }
      }
      else if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.substring(1); // Usuń wiodący '/'
      }
      
      if (videoId && videoId.includes('&')) {
        videoId = videoId.split('&')[0];
      }

    } catch (e) {
      console.error(`Nie udało się sparsować URL: ${url}`, e.message);
      const regex = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(regex);
      if (match) {
        videoId = match[1];
      }
    }
    
    return videoId;
  }
}
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuizService } from './quiz.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { UploadMaterialsDto } from './dto/upload-materials.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Import strażnika JWT

@Controller('api/quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * Pobiera listę wszystkich quizów należących do zalogowanego użytkownika.
   * Klawisz do funkcjonalności "powrotu do sesji".
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-quizzes')
  async findAllForUser(@Request() req) {
    const userId = req.user.sub; // ID użytkownika wyciągnięte z tokena JWT
    return this.quizService.findAllByUser(userId);
  }

  /**
   * Endpoint do pobierania danych konkretnego quizu po jego ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    console.log(`--- OTRZYMANO ŻĄDANIE GET DLA QUIZU O ID: ${id} ---`);
    
    try {
      const quiz = await this.quizService.findById(id);
      
      if (!quiz) {
        throw new NotFoundException(`Quiz o ID "${id}" nie został znaleziony.`);
      }
      
      return quiz;
    } catch (error) {
      console.error('❌ Błąd w kontrolerze findOne:', error.message);
      throw error;
    }
  }

  /**
   * Endpoint do przesyłania materiałów (Krok 1).
   * Dostępny tylko dla zalogowanych.
   */
  @UseGuards(JwtAuthGuard)
  @Post('materials')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterials(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadMaterialsDto: UploadMaterialsDto,
  ) {
    if (!file) {
      throw new BadRequestException('Plik z notatkami jest wymagany.');
    }
    const sessionId = await this.quizService.handleFileUpload(
      file,
      uploadMaterialsDto.youtubeUrl,
    );
    return { sessionId };
  }

  /**
   * Endpoint do generowania quizu na podstawie ustawień (Krok 2).
   * Przypisuje stworzony quiz do zalogowanego użytkownika.
   */
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuiz(@Body() generateQuizDto: GenerateQuizDto, @Request() req) {
    const userId = req.user.sub;
    const createdQuiz = await this.quizService.createQuiz(generateQuizDto, userId);
    return { quizId: createdQuiz._id };
  }

  /**
   * Aktualizuje postęp w quizie (zapisuje rozwiązane pytania).
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body() body: { completedQuestionIds: string[] },
  ) {
    return this.quizService.updateProgress(id, body.completedQuestionIds);
  }
  
  /**
   * Endpoint testowy.
   */
  @Get('test')
  testEndpoint() {
    return { message: 'Hello from the test endpoint! The controller is working.' };
  }
}
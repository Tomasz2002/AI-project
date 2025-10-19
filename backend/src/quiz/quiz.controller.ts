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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuizService } from './quiz.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { UploadMaterialsDto } from './dto/upload-materials.dto';

@Controller('api/quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * Endpoint do pobierania danych gotowego quizu po jego ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    console.log(`--- OTRZYMANO ŻĄDANIE GET DLA QUIZU O ID: ${id} ---`);
    
    try {
      const quiz = await this.quizService.findById(id);
      
      if (!quiz) {
        throw new NotFoundException(`Quiz o ID "${id}" nie został znaleziony w bazie danych.`);
      }
      
      return quiz;
    } catch (error) {
      console.error('❌ Błąd w kontrolerze findOne:', error.message);
      // Przekaż błąd dalej, aby NestJS go obsłużył i wysłał odpowiedni status HTTP
      // (np. 400 dla BadRequestException lub 500 dla innych błędów).
      throw error;
    }
  }

  /**
   * Endpoint do przesyłania materiałów (Krok 1).
   */
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
   */
  @Post('generate')
  async generateQuiz(@Body() generateQuizDto: GenerateQuizDto) {
    const createdQuiz = await this.quizService.createQuiz(generateQuizDto);
    return { quizId: createdQuiz._id };
  }
  
  /**
   * Endpoint testowy do weryfikacji działania kontrolera.
   */
  @Get('test')
  testEndpoint() {
    return { message: 'Hello from the test endpoint! The controller is working.' };
  }
}
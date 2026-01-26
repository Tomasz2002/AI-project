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
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuizService } from './quiz.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { UploadMaterialsDto } from './dto/upload-materials.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // Endpoint do ręcznego sprawdzenia dostępnych modeli AI
  @UseGuards(JwtAuthGuard)
  @Get('debug/models')
  async debugModels() {
    return this.quizService.checkAvailableModels();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-quizzes')
  async findAllForUser(@Request() req) {
    const userId = req.user.sub;
    return this.quizService.findAllByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const quiz = await this.quizService.findById(id);
    if (!quiz) throw new NotFoundException(`Quiz nie znaleziony.`);
    return quiz;
  }

  @UseGuards(JwtAuthGuard)
  @Post('materials')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterials(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadMaterialsDto) {
    if (!file) throw new BadRequestException('Plik jest wymagany.');
    const sessionId = await this.quizService.handleFileUpload(file, dto.youtubeUrl);
    return { sessionId };
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuiz(@Body() dto: GenerateQuizDto, @Request() req) {
    const userId = req.user.sub;
    // Tutaj błędy 429/503 zostaną rzucone jako InternalServerErrorException
    const createdQuiz = await this.quizService.createQuiz(dto, userId);
    return { quizId: createdQuiz._id };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/progress')
  async updateProgress(@Param('id') id: string, @Body() body: { completedQuestionIds: string[] }) {
    return this.quizService.updateProgress(id, body.completedQuestionIds);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteQuiz(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    await this.quizService.deleteQuiz(id, userId);
    return { message: 'Usunięto pomyślnie' };
  }
}
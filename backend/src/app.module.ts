import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuizModule } from './quiz/quiz.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // Moduł do obsługi zmiennych środowiskowych (.env)
    ConfigModule.forRoot({
      isGlobal: true, // Udostępnij konfigurację w całej aplikacji
    }),
    // Importujemy nasz moduł do obsługi quizów
    QuizModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Witaj w aplikacji do generowania quizów AI!';
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Zostawiamy tylko JEDNO, poprawne wywołanie
  await app.listen(3001, '127.0.0.1');

  console.log(`Backend is running on: ${await app.getUrl()}`);
}
bootstrap();
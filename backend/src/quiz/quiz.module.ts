import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz, QuizSchema } from '../models/quiz.model';
import { RoomSchema } from '../models/room.model';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: 'Room', schema: RoomSchema }
    ]),
    HttpModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, RoomService, RoomGateway],
  exports: [QuizService],
})
export class QuizModule {}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRoom, Room } from '../models/room.model';
import { QuizService } from './quiz.service';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel('Room') private roomModel: Model<IRoom>,
    private readonly quizService: QuizService
  ) {}

  async createRoom(hostId: string, username: string): Promise<IRoom> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom = new this.roomModel({
      code,
      hostId,
      participants: [{ userId: hostId, username, score: 0, answers: [] }],
      status: 'LOBBY'
    });
    return newRoom.save();
  }

  async joinRoom(code: string, userId: string, username: string): Promise<IRoom> {
    const room = await this.roomModel.findOne({ code, status: 'LOBBY' });
    if (!room) throw new NotFoundException('Pokój nie istnieje lub gra już trwa.');
    if (room.participants.length >= room.maxParticipants) throw new BadRequestException('Pokój jest pełny.');
    
    const isAlreadyIn = room.participants.find(p => p.userId === userId);
    if (!isAlreadyIn) {
      room.participants.push({ userId, username, score: 0, answers: [] });
      await room.save();
    }
    return room;
  }

  async startQuiz(code: string): Promise<IRoom> {
    const room = await this.roomModel.findOne({ code });
    if (!room) throw new NotFoundException();
    room.status = 'IN_PROGRESS';
    return room.save();
  }

  async updateProgress(code: string, userId: string, isCorrect: boolean): Promise<any> {
    const room = await this.roomModel.findOne({ code });
    const participant = room.participants.find(p => p.userId === userId);
    if (participant) {
      if (isCorrect) participant.score += 100;
      await room.save();
    }
    return room.participants.map(p => ({ username: p.username, score: p.score }));
  }
}
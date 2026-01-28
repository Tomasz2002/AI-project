import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'rooms'
})
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomService: RoomService) {}

  @SubscribeMessage('createRoom')
  async handleCreateRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string, username: string }) {
    const room = await this.roomService.createRoom(data.userId, data.username);
    client.join(room.code);
    return { code: room.code };
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { code: string, userId: string, username: string }) {
    const room = await this.roomService.joinRoom(data.code, data.userId, data.username);
    client.join(room.code);
    this.server.to(room.code).emit('playerJoined', room.participants);
    return room;
  }

  @SubscribeMessage('startQuiz')
  async handleStartQuiz(@ConnectedSocket() client: Socket, @MessageBody() data: { code: string }) {
    const room = await this.roomService.startQuiz(data.code);
    this.server.to(data.code).emit('quizStarted', { quizId: room.quizId, duration: 20 });
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(@MessageBody() data: { code: string, userId: string, questionId: string, isCorrect: boolean }) {
    const progress = await this.roomService.updateProgress(data.code, data.userId, data.isCorrect);
    this.server.to(data.code).emit('progressUpdate', progress);
  }
}
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QuizService } from './quiz.service';

interface RoomState {
  quizId: string;
  players: { id: string; name: string; score: number; currentAnswer: string | null }[];
  currentQuestionIndex: number;
  timer: NodeJS.Timeout | null;
  timeLeft: number;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'study' })
export class StudyRoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private rooms = new Map<string, RoomState>();

  constructor(private readonly quizService: QuizService) {}

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    this.rooms.forEach((state, roomId) => {
      state.players = state.players.filter(p => p.id !== client.id);
      if (state.players.length === 0) {
        if (state.timer) clearInterval(state.timer);
        this.rooms.delete(roomId);
      } else {
        this.server.to(roomId).emit('roomUpdated', state);
      }
    });
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { quizId: string; name: string }) {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const state: RoomState = {
      quizId: data.quizId,
      players: [{ id: client.id, name: data.name, score: 0, currentAnswer: null }],
      currentQuestionIndex: 0,
      timer: null,
      timeLeft: 30,
    };
    this.rooms.set(roomId, state);
    client.join(roomId);
    return { roomId, state };
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; name: string }) {
    const state = this.rooms.get(data.roomId);
    if (!state) return { error: 'Pokój nie istnieje' };
    if (state.players.length >= 5) return { error: 'Pokój jest pełny' };

    state.players.push({ id: client.id, name: data.name, score: 0, currentAnswer: null });
    client.join(data.roomId);
    this.server.to(data.roomId).emit('roomUpdated', state);
    return { state };
  }

  @SubscribeMessage('startQuiz')
  async handleStartQuiz(@MessageBody() data: { roomId: string }) {
    const state = this.rooms.get(data.roomId);
    if (!state) return;

    const quiz = await this.quizService.findById(state.quizId);
    const allQuestions = quiz.generatedQuizzes.flatMap(q => q.questions);
    
    this.startCountdown(data.roomId, allQuestions);
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; answer: string }) {
    const state = this.rooms.get(data.roomId);
    if (!state) return;

    const player = state.players.find(p => p.id === client.id);
    if (player && !player.currentAnswer) {
      player.currentAnswer = data.answer;
      
      const quiz = await this.quizService.findById(state.quizId);
      const allQuestions = quiz.generatedQuizzes.flatMap(q => q.questions);
      const currentQ = allQuestions[state.currentQuestionIndex];

      if (data.answer === currentQ.correctAnswer) {
        player.score += 1;
      }

      this.server.to(data.roomId).emit('playerAnswered', { 
        playerId: client.id, 
        answer: data.answer 
      });

      const allAnswered = state.players.every(p => p.currentAnswer !== null);
      if (allAnswered) {
        this.nextQuestion(data.roomId, allQuestions);
      }
    }
  }

  private startCountdown(roomId: string, questions: any[]) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    state.timeLeft = 30;
    this.server.to(roomId).emit('questionStarted', {
      question: questions[state.currentQuestionIndex],
      index: state.currentQuestionIndex,
      total: questions.length,
      timeLeft: state.timeLeft
    });

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      state.timeLeft -= 1;
      this.server.to(roomId).emit('timerTick', state.timeLeft);

      if (state.timeLeft <= 0) {
        this.nextQuestion(roomId, questions);
      }
    }, 1000);
  }

  private nextQuestion(roomId: string, questions: any[]) {
    const state = this.rooms.get(roomId);
    if (!state || !state.timer) return;

    clearInterval(state.timer);
    state.players.forEach(p => p.currentAnswer = null);

    if (state.currentQuestionIndex < questions.length - 1) {
      state.currentQuestionIndex += 1;
      this.startCountdown(roomId, questions);
    } else {
      this.server.to(roomId).emit('quizEnded', state.players);
      this.rooms.delete(roomId);
    }
  }
}
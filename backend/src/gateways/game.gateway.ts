import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Player {
    id: string;
    username: string;
    score: number;
    isHost?: boolean;
}

interface Room {
    id: string;
    hostId: string;
    players: Player[];
    quizData: any; // Store the full quiz object
    currentQuestionIndex: number;
    isGameStarted: boolean;
    answers: Record<string, string>; // playerId -> answer (for current question)
    settings: {
        questionCount: number;
        timerSeconds: number;
    };
}

@WebSocketGateway({
    cors: {
        origin: '*', // Adjust in production
    },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms: Record<string, Room> = {};

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        this.removePlayerFromRoom(client.id);
    }

    private broadcastPlayerList(roomId: string) {
        const room = this.rooms[roomId];
        if (!room) return;

        const playersWithHost = room.players.map(p => ({
            ...p,
            isHost: p.id === room.hostId
        }));
        this.server.to(roomId).emit('updatePlayerList', playersWithHost);
    }

    private removePlayerFromRoom(clientId: string) {
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === clientId);

            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                room.players.splice(playerIndex, 1);
                this.server.to(roomId).emit('playerLeft', { playerId: clientId, username: player.username });
                this.broadcastPlayerList(roomId);

                // If room is empty, delete it
                if (room.players.length === 0) {
                    delete this.rooms[roomId];
                } else if (room.hostId === clientId) {
                    // Assign new host if host left (optional, for now just grab the first one)
                    room.hostId = room.players[0].id;
                    this.server.to(roomId).emit('hostChanged', { newHostId: room.hostId });
                    this.broadcastPlayerList(roomId);
                }
                break;
            }
        }
    }

    @SubscribeMessage('createRoom')
    async handleCreateRoom(
        @MessageBody() data: { username: string; quizData: any },
        @ConnectedSocket() client: Socket,
    ) {
        console.log(`[GameGateway] createRoom called by ${client.id}`);
        try {
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            console.log(`[GameGateway] Generated room ID: ${roomId}`);

            const newRoom: Room = {
                id: roomId,
                hostId: client.id,
                players: [{
                    id: client.id,
                    username: data.username,
                    score: 0
                }],
                quizData: data.quizData,
                currentQuestionIndex: 0,
                isGameStarted: false,
                answers: {},
                settings: {
                    questionCount: data.quizData.questions?.length || 0,
                    timerSeconds: 20
                }
            };

            this.rooms[roomId] = newRoom;
            console.log(`[GameGateway] Room object created. Joining client to room...`);

            await client.join(roomId);
            console.log(`[GameGateway] Client joined room. Emitting roomCreated event...`);

            client.emit('roomCreated', { event: 'roomCreated', data: { roomId, player: newRoom.players[0] } });
            return;
        } catch (error) {
            console.error('[GameGateway] createRoom error:', error);
            return { error: 'Failed to create room' };
        }
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(
        @MessageBody() data: { roomId: string; username: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = this.rooms[data.roomId];
        if (!room) {
            return { error: 'Pokój nie istnieje.' };
        }
        if (room.isGameStarted) {
            return { error: 'Gra już trwa.' };
        }
        if (room.players.length >= 5) {
            return { error: 'Pokój jest pełny.' };
        }

        const newPlayer: Player = {
            id: client.id,
            username: data.username,
            score: 0
        };

        room.players.push(newPlayer);
        client.join(data.roomId);

        this.server.to(data.roomId).emit('playerJoined', newPlayer);

        const playersWithHost = room.players.map(p => ({ ...p, isHost: p.id === room.hostId }));
        this.server.to(data.roomId).emit('updatePlayerList', playersWithHost);

        client.emit('joinedRoom', {
            event: 'joinedRoom',
            data: {
                roomId: data.roomId,
                players: room.players,
                hostId: room.hostId,
                quizTitle: room.quizData?.documentFileName || 'Quiz'
            }
        });
        return;
    }

    @SubscribeMessage('getRoomInfo')
    handleGetRoomInfo(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = this.rooms[data.roomId];
        if (room) {
            // Send to specific client, but reuse logic?
            // broadcastPlayerList sends to ROOM. We want to send to CLIENT.
            // Let's just inline it correctly here for single client
            const playersWithHost = room.players.map(p => ({
                ...p,
                isHost: p.id === room.hostId
            }));
            this.server.to(client.id).emit('updatePlayerList', playersWithHost);
        }
    }

    @SubscribeMessage('startGame')
    handleStartGame(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = this.rooms[data.roomId];
        if (!room) return { error: 'Pokój nie istnieje' };
        if (room.hostId !== client.id) return { error: 'Tylko gospodarz może rozpocząć grę' };

        room.isGameStarted = true;
        room.currentQuestionIndex = 0;

        this.server.to(data.roomId).emit('gameStarted', {
            quizData: room.quizData
        });

        // Start user flow - maybe show video first? 
        // For simplicity, let's assume client handles the phases (video -> questions)
        // OR we trigger the first question directly if needed.
        // Based on user desc: "potem wszyscy razem po kliknieciu zaczynaj zacyznaja odpowiadac na quizy"
        // Assuming they watch video individually or it's skipped for multiplayer?
        // User said: "wybiera filmik yt do ogladania... Widac kto jak odpowiada na które quizy w czasie rzeczywistym"
        // Let's emit a signal to start the session.
    }

    @SubscribeMessage('submitAnswer')
    handleSubmitAnswer(
        @MessageBody() data: { roomId: string; answer: string; timeRemaining: number },
        @ConnectedSocket() client: Socket,
    ) {
        const room = this.rooms[data.roomId];
        if (!room) return;

        // Record answer
        room.answers[client.id] = data.answer;

        // Check correctness and update score
        const questions = room.quizData.questions || room.quizData.generatedQuizzes?.[0]?.questions || [];
        const currentQuestion = questions[room.currentQuestionIndex];

        if (currentQuestion && data.answer === currentQuestion.correctAnswer) {
            // Find player and increment score
            const player = room.players.find(p => p.id === client.id);
            if (player) {
                player.score += 1;
            }
        }

        this.server.to(data.roomId).emit('playerAnswered', { playerId: client.id });

        // Check if all answered
        if (Object.keys(room.answers).length === room.players.length) {
            // Emit round results
            this.server.to(data.roomId).emit('roundFinished', {
                correctAnswer: currentQuestion.correctAnswer,
                answers: room.answers,
                players: room.players,
                nextQuestionIndex: room.currentQuestionIndex + 1
            });

            // Prepare for next round
            room.currentQuestionIndex += 1;
            room.answers = {}; // Reset answers
        }
    }
    @SubscribeMessage('videoStateChange')
    handleVideoStateChange(
        @MessageBody() data: { roomId: string; state: string; time: number },
        @ConnectedSocket() client: Socket,
    ) {
        // Broadcast to all others in room except sender? 
        // client.to(roomId) broadcasts to everyone in room EXCEPT sender. This is perfect.
        // If we used server.to(roomId), the sender would get it back and loop.
        client.to(data.roomId).emit('syncVideo', data);
    }
}



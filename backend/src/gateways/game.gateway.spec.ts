import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { Socket } from 'socket.io';

describe('GameGateway', () => {
    let gateway: GameGateway;
    let mockSocket: Partial<Socket>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GameGateway],
        }).compile();

        gateway = module.get<GameGateway>(GameGateway);
        gateway.server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;

        mockSocket = {
            id: 'mock-client-id',
            join: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateRoom', () => {
        it('should create a room and join client to it', async () => {
            const data = { username: 'HostUser', quizData: { questions: [{}, {}, {}, {}, {}] } }; // 5 questions
            await gateway.handleCreateRoom(data, mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('roomCreated', expect.objectContaining({
                data: expect.objectContaining({
                    player: expect.objectContaining({ username: 'HostUser' }) // first player logic usually implies host if logical check
                })
            }));
        });
    });

    describe('Questions Handling', () => {
        it('should correctly count questions from flat structure', async () => {
            const data = { username: 'Host', quizData: { questions: [1, 2, 3] } };
            await gateway.handleCreateRoom(data, mockSocket as Socket);

            // We can access private rooms via 'any' cast for testing
            const rooms = (gateway as any).rooms;
            const roomId = Object.keys(rooms)[0];
            const room = rooms[roomId];

            expect(room.settings.questionCount).toBe(3);
        });

        it('should correctly count questions from generatedQuizzes structure', async () => {
            const data = {
                username: 'Host',
                quizData: {
                    generatedQuizzes: [
                        { timestamp: 10, questions: [1, 2] },
                        { timestamp: 20, questions: [3, 4, 5] }
                    ]
                }
            };
            await gateway.handleCreateRoom(data, mockSocket as Socket);

            const rooms = (gateway as any).rooms;
            const roomId = Object.keys(rooms)[0];
            const room = rooms[roomId];

            expect(room.settings.questionCount).toBe(5);
        });
    });

    describe('handleSubmitAnswer', () => {
        let roomId: string;

        beforeEach(async () => {
            // Setup a room first
            const data = {
                username: 'Host',
                quizData: {
                    questions: [
                        { correctAnswer: 'A' },
                        { correctAnswer: 'B' }
                    ]
                }
            };
            await gateway.handleCreateRoom(data, mockSocket as Socket);
            const rooms = (gateway as any).rooms;
            roomId = Object.keys(rooms)[0];
        });

        it('should increment score on correct answer', () => {
            const answerData = { roomId, answer: 'A', timeRemaining: 10 }; // Correct Answer
            gateway.handleSubmitAnswer(answerData, mockSocket as Socket);

            const rooms = (gateway as any).rooms;
            const room = rooms[roomId];
            const player = room.players.find((p: any) => p.id === mockSocket.id);

            expect(player.score).toBe(1);
        });

        it('should NOT increment score on wrong answer', () => {
            const answerData = { roomId, answer: 'C', timeRemaining: 10 }; // Wrong Answer
            gateway.handleSubmitAnswer(answerData, mockSocket as Socket);

            const rooms = (gateway as any).rooms;
            const room = rooms[roomId];
            const player = room.players.find((p: any) => p.id === mockSocket.id);

            expect(player.score).toBe(0);
        });
    });
});

import { Schema, model, Document } from 'mongoose';

export interface IRoom extends Document {
  code: string;
  hostId: string;
  participants: Array<{
    userId: string;
    username: string;
    score: number;
    answers: Array<{
      questionId: string;
      isCorrect: boolean;
    }>;
  }>;
  quizId?: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'FINISHED';
  maxParticipants: number;
  createdAt: Date;
}

export const RoomSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{
    userId: { type: String, required: true },
    username: { type: String, required: true },
    score: { type: Number, default: 0 },
    answers: [{
      questionId: { type: String },
      isCorrect: { type: Boolean }
    }]
  }],
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
  status: { type: String, enum: ['LOBBY', 'IN_PROGRESS', 'FINISHED'], default: 'LOBBY' },
  maxParticipants: { type: Number, default: 5 },
  createdAt: { type: Date, default: Date.now, expires: 3600 }
});

export const Room = model<IRoom>('Room', RoomSchema);
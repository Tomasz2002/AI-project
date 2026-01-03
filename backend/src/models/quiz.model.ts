import { Schema, model, Document } from 'mongoose';

export interface IQuiz extends Document {
  userId: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  youtubeVideoDurationSeconds: number; 
  documentFileName: string;
  documentFilePath: string; 
  pageFrom: number;
  pageTo: number;
  quizQuestionCount: number; 
  questionsToUnlock: number; 
  generatedQuizzes: Array<{
    timestamp: number; 
    timestampFormatted: string; 
    questions: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
  completedQuestions: string[];
}

export const QuizSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  completedQuestions: [{ type: String }],
  youtubeUrl: { type: String, required: true },
  youtubeVideoId: { type: String, required: true },
  youtubeVideoDurationSeconds: { type: Number, required: true },
  documentFileName: { type: String, required: true },
  documentFilePath: { type: String, required: true },
  pageFrom: { type: Number, required: true },
  pageTo: { type: Number, required: true },
  quizQuestionCount: { type: Number, required: true },
  questionsToUnlock: { type: Number, required: true },
  generatedQuizzes: [
    {
      timestamp: { type: Number, required: true },
      timestampFormatted: { type: String, required: true }, // <-- NOWE POLE
      questions: [
        {
          questionText: { type: String, required: true },
          options: [{ type: String, required: true }],
          correctAnswer: { type: String, required: true },
        },
      ],
    },
  ],
}, { timestamps: true,
  collection: 'quizzes'
 });

export const Quiz = model<IQuiz>('Quiz', QuizSchema);
import { Schema, model, Document } from 'mongoose';

export interface IQuiz extends Document {
  youtubeUrl: string;
  youtubeVideoId: string;
  youtubeVideoDurationSeconds: number; // Czas trwania w sekundach
  documentFileName: string;
  documentFilePath: string; 
  pageFrom: number;
  pageTo: number;
  quizQuestionCount: number; 
  questionsToUnlock: number; 
  generatedQuizzes: Array<{
    timestamp: number; // np. 272
    timestampFormatted: string; // <-- NOWE POLE (np. "4:32")
    questions: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const QuizSchema: Schema = new Schema({
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
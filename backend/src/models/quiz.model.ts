import { Schema, model, Document } from 'mongoose';

export interface IQuiz extends Document {
  youtubeUrl: string;
  youtubeVideoId: string;
  documentFileName: string;
  documentFilePath: string; // Ścieżka do przechowywanego pliku na serwerze
  pageFrom: number;
  pageTo: number;
  quizQuestionCount: number; // Liczba pytań w całym quizie
  questionsToUnlock: number; // Ile poprawnych odpowiedzi odblokowuje wideo
  generatedQuizzes: Array<{
    timestamp: number; // Czas w sekundach, w którym quiz ma się pojawić w filmie
    questions: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// DODANO "export" TUTAJ:
export const QuizSchema: Schema = new Schema({
  youtubeUrl: { type: String, required: true },
  youtubeVideoId: { type: String, required: true },
  documentFileName: { type: String, required: true },
  documentFilePath: { type: String, required: true },
  pageFrom: { type: Number, required: true },
  pageTo: { type: Number, required: true },
  quizQuestionCount: { type: Number, required: true },
  questionsToUnlock: { type: Number, required: true },
  generatedQuizzes: [
    {
      timestamp: { type: Number, required: true },
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
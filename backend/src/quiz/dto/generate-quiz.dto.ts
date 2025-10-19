import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class GenerateQuizDto {
  @IsString()
  @IsNotEmpty({ message: 'ID sesji jest wymagane.' })
  sessionId: string;

  @IsInt()
  @Min(1)
  pageFrom: number;

  @IsInt()
  @Min(1)
  pageTo: number;

  @IsInt()
  @Min(1)
  quizCount: number;

  @IsInt()
  @Min(1)
  questionsToUnlock: number;
}
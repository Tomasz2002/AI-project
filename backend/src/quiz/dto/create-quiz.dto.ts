/**
 * DTO (Data Transfer Object) definiujący dane potrzebne
 * do stworzenia nowego quizu.
 * Używany do walidacji przychodzących zapytań.
 */
export class CreateQuizDto {
  // Dodajemy '!' aby poinformować TypeScript, że ta właściwość
  // zostanie na pewno zainicjowana (przez NestJS ValidationPipe).
  youtubeUrl!: string;

  // To samo dotyczy tej właściwości.
  questionCount!: number;

  // Można tu dodać inne opcjonalne lub wymagane pola, np.
  // documentUrl?: string;
  // pages?: number[];
}


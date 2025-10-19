// src/services/quizApi.ts

const API_BASE_URL = '/api/quiz'; // Centralne miejsce na bazowy URL

/**
 * Funkcja do obsługi błędów API
 */
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Wystąpił nieznany błąd serwera.' }));
    throw new Error(errorData.message || `Błąd HTTP: ${response.status}`);
  }
  return response.json();
};

/**
 * Wysyła materiały (link YouTube i plik) na serwer.
 * @returns {Promise<any>} Obiekt z danymi z backendu, np. { sessionId: '...' }
 */
export const uploadMaterials = async (youtubeUrl: string, file: File): Promise<{ sessionId: string }> => {
  const formData = new FormData();
  formData.append('youtubeUrl', youtubeUrl);
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/materials`, {
    method: 'POST',
    body: formData,
  });

  return handleApiError(response);
};

/**
 * Generuje quiz na podstawie ustawień i ID sesji.
 * @returns {Promise<any>} Obiekt z danymi wygenerowanego quizu, np. { quizId: '...' }
 */
export const generateQuiz = async (
    sessionId: string, 
    pageFrom: number, 
    pageTo: number, 
    quizCount: number, 
    questionsToUnlock: number
): Promise<{ quizId: string }> => {
    
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      pageFrom,
      pageTo,
      quizCount,
      questionsToUnlock,
    }),
  });

  return handleApiError(response);
};
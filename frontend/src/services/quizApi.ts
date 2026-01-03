// src/services/quizApi.ts

const API_BASE_URL = '/api/quiz';

/**
 * Funkcja pomocnicza do pobierania nagłówków autoryzacyjnych.
 * @param isFormData - Czy żądanie wysyła pliki (FormData nie wymaga ręcznego ustawiania Content-Type)
 */
const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

/**
 * Funkcja do obsługi błędów API
 */
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    // Próba pobrania komunikatu o błędzie z backendu (np. z BadRequestException)
    const errorData = await response.json().catch(() => ({ message: 'Wystąpił nieznany błąd serwera.' }));
    throw new Error(errorData.message || `Błąd HTTP: ${response.status}`);
  }
  return response.json();
};

/**
 * Krok 1: Wysyła materiały (link YouTube i plik) na serwer.
 */
export const uploadMaterials = async (youtubeUrl: string, file: File): Promise<{ sessionId: string }> => {
  const formData = new FormData();
  formData.append('youtubeUrl', youtubeUrl);
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/materials`, {
    method: 'POST',
    headers: getHeaders(true), // Przekazujemy true, aby nie nadpisywać boundary FormData
    body: formData,
  });

  return handleApiError(response);
};

/**
 * Krok 2: Generuje quiz na podstawie ustawień i ID sesji.
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
    headers: getHeaders(),
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

/**
 * Pobiera dane konkretnego quizu po jego ID (używane w Playerze).
 */
export const getQuizById = async (quizId: string) => {
  const response = await fetch(`${API_BASE_URL}/${quizId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleApiError(response);
};

/**
 * Pobiera listę wszystkich quizów stworzonych przez zalogowanego użytkownika.
 * Pozwala to na "powrót do sesji" z poziomu pulpitu/historii.
 */
export const getMyQuizzes = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/my-quizzes`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleApiError(response);
};

/**
 * Aktualizuje postęp użytkownika w danym quizie.
 * Wysyła listę ID pytań, na które użytkownik poprawnie odpowiedział.
 */
export const updateQuizProgress = async (quizId: string, completedQuestionIds: string[]) => {
  const response = await fetch(`${API_BASE_URL}/${quizId}/progress`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ completedQuestionIds }),
  });
  return handleApiError(response);
};

/**
 * Usuwa quiz z historii użytkownika.
 */
export const deleteQuiz = async (quizId: string) => {
  const response = await fetch(`${API_BASE_URL}/${quizId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleApiError(response);
};
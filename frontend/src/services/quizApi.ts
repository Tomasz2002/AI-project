const API_BASE_URL = '/api/quiz';

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

const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Wystąpił nieznany błąd serwera.' }));
    throw new Error(errorData.message || `Błąd HTTP: ${response.status}`);
  }
  return response.json();
};

export const uploadMaterials = async (youtubeUrl: string, file: File): Promise<{ sessionId: string }> => {
  const formData = new FormData();
  formData.append('youtubeUrl', youtubeUrl);
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/materials`, {
    method: 'POST',
    headers: getHeaders(true),
    body: formData,
  });

  return handleApiError(response);
};

export const generateQuiz = async (
  sessionId: string,
  pageFrom: number,
  pageTo: number,
  quizCount: number
): Promise<{ quizId: string }> => {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      sessionId,
      pageFrom,
      pageTo,
      quizCount,
    }),
  });

  return handleApiError(response);
};

export const getQuizById = async (quizId: string) => {
  const response = await fetch(`${API_BASE_URL}/${quizId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleApiError(response);
};

export const getMyQuizzes = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/my-quizzes`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleApiError(response);
};

export const updateQuizProgress = async (quizId: string, completedQuestionIds: string[]) => {
  const response = await fetch(`${API_BASE_URL}/${quizId}/progress`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ completedQuestionIds }),
  });
  return handleApiError(response);
};

export const deleteQuiz = async (quizId: string) => {
  const response = await fetch(`${API_BASE_URL}/${quizId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleApiError(response);
};
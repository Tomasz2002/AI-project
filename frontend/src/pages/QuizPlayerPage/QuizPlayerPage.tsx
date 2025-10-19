import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import YouTube, { YouTubePlayer, YouTubeProps } from 'react-youtube';
import styles from './QuizPlayerPage.module.scss';
import 'bootstrap/dist/css/bootstrap.min.css';

// Interfejsy
interface IQuestion {
  _id?: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface IGeneratedQuiz {
  _id?: string;
  timestamp: number;
  questions: IQuestion[];
}

interface IQuizData {
  _id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  documentFileName: string;
  generatedQuizzes: IGeneratedQuiz[];
  questionsToUnlock: number;
}

const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();

  // Stany do danych, ładowania i błędów
  const [quizData, setQuizData] = useState<IQuizData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stany do obsługi interaktywności
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [currentQuiz, setCurrentQuiz] = useState<IGeneratedQuiz | null>(null);
  const [lastShownQuizIndex, setLastShownQuizIndex] = useState<number>(-1);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);

  // Funkcja pomocnicza do wyciągania ID wideo z pełnego URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };
  
  // Pobieranie danych quizu
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        setError('Nie znaleziono ID quizu w adresie URL.');
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error(`Nie udało się pobrać danych quizu. Status: ${response.status}`);
        }
        
        const data: IQuizData = await response.json();
        console.log("✅ SUKCES! Dane pobrane z backendu:", data);
        const videoId = getYouTubeVideoId(data.youtubeUrl);
        if (!videoId) {
          throw new Error('Nieprawidłowy link do YouTube. Nie można wyodrębnić ID wideo.');
        }

        data.youtubeVideoId = videoId;
        setQuizData(data);
      } catch (err: any) {
        console.error("❌ BŁĄD! Nie udało się pobrać lub przetworzyć danych:", err);
        setError(err.message || 'Wystąpił nieoczekiwany błąd.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuizData();
  }, [quizId]);

  // Efekt do monitorowania czasu wideo i uruchamiania quizów
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && quizData && typeof playerRef.current.getPlayerState === 'function' && playerRef.current.getPlayerState() === 1) {
        const currentTime = playerRef.current.getCurrentTime();
        
        const nextQuizIndex = quizData.generatedQuizzes.findIndex((q, index) => index > lastShownQuizIndex && currentTime >= q.timestamp);

        if (nextQuizIndex !== -1) {
          playerRef.current.pauseVideo();
          setCurrentQuiz(quizData.generatedQuizzes[nextQuizIndex]);
          setShowQuiz(true);
          setLastShownQuizIndex(nextQuizIndex);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [quizData, lastShownQuizIndex]);

  // Funkcja obsługująca odpowiedź użytkownika
  const handleAnswerClick = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };
  
  // Efekt sprawdzający, czy quiz został rozwiązany
  useEffect(() => {
    if (quizData && correctAnswersCount >= quizData.questionsToUnlock) {
      setTimeout(() => {
        setShowQuiz(false);
        setCurrentQuiz(null);
        setCorrectAnswersCount(0);
        playerRef.current?.playVideo();
      }, 1500);
    }
  }, [correctAnswersCount, quizData]);

  // Opcje dla odtwarzacza YouTube
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
    },
  };
  
  // Renderowanie komponentu
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
        <p>Ładowanie quizu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-danger m-5 ${styles.errorAlert}`} role="alert">
        <strong>Błąd:</strong> {error}
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className={`alert alert-warning m-5 ${styles.warningAlert}`} role="alert">
        Nie znaleziono danych dla tego quizu.
      </div>
    );
  }

  return (
    <div className={`container ${styles.quizContainer}`}>
      <h1>Twój Wygenerowany Quiz</h1>

      <div className={styles.playerAndQuizWrapper}>
        <div className={styles.videoWrapper}>
          <YouTube
            videoId={quizData.youtubeVideoId}
            opts={opts}
            onReady={(event) => (playerRef.current = event.target)}
            className={styles.youtubePlayer}
          />
        </div>

        {showQuiz && currentQuiz && (
          <div className={styles.quizOverlay}>
            <div className={`card ${styles.quizCard}`}>
              <div className="card-header">
                <h3>Quiz w {currentQuiz.timestamp}s</h3>
                <p className="mb-0">
                  Odpowiedz poprawnie na {quizData.questionsToUnlock} pytań, aby kontynuować.
                </p>
              </div>
              <div className="card-body">
                {currentQuiz.questions.map((q, qIndex) => (
                  <div key={q._id || qIndex} className={styles.questionBlock}>
                    <p><strong>Pytanie:</strong> {q.questionText}</p>
                    <div className={styles.optionsContainer}>
                      {q.options.map((option, optIndex) => (
                        <button
                          key={optIndex}
                          className="btn btn-outline-primary"
                          onClick={() => handleAnswerClick(option === q.correctAnswer)}
                          disabled={correctAnswersCount >= quizData.questionsToUnlock}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className={styles.progressTracker}>
                  <p>Poprawne odpowiedzi: {correctAnswersCount} / {quizData.questionsToUnlock}</p>
                  {correctAnswersCount >= quizData.questionsToUnlock && (
                    <div className="alert alert-success mt-2">
                      <strong>Świetnie!</strong> Film zaraz zostanie wznowiony.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Informacje o quizie */}
      <div className={`card ${styles.infoCard}`}>
        <div className="card-header">
          📋 Podstawowe Informacje
        </div>
        <div className="card-body">
          <p><strong>ID Quizu:</strong> {quizData._id}</p>
          <p>
            <strong>Link do YouTube:</strong>{' '}
            <a href={quizData.youtubeUrl} target="_blank" rel="noopener noreferrer">
              {quizData.youtubeUrl}
            </a>
          </p>
          <p><strong>Nazwa dokumentu:</strong> {quizData.documentFileName}</p>
        </div>
      </div>

      <h2>📝 Pytania w Quizie</h2>
     
      {quizData.generatedQuizzes.map((quiz, index) => (
        <div key={index} className={`card ${styles.quizCard}`}>
          <div className="card-header">
            Quiz w {quiz.timestamp} sekundzie filmu
          </div>
          <ul className="list-group list-group-flush">
            {quiz.questions.map((q, qIndex) => (
              <li key={qIndex} className={`list-group-item ${styles.questionItem}`}>
                <p>
                  <strong>Pytanie {qIndex + 1}:</strong> {q.questionText}
                </p>
                <small className={styles.correctAnswer}>
                  ✓ Poprawna odpowiedź: {q.correctAnswer}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default QuizPlayerPage;
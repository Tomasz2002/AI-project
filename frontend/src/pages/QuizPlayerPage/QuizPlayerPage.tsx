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
  timestampFormatted: string;
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

  // Stany do danych
  const [quizData, setQuizData] = useState<IQuizData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stany do obsługi interaktywności
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [currentQuiz, setCurrentQuiz] = useState<IGeneratedQuiz | null>(null);
  const [lastShownQuizIndex, setLastShownQuizIndex] = useState<number>(-1);
  const [answeredQuestionsCount, setAnsweredQuestionsCount] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [awaitingAcknowledgment, setAwaitingAcknowledgment] = useState<boolean>(false);

  // Funkcja pomocnicza
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

  // Efekt do monitorowania czasu wideo (bez zmian, używa timestamp)
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && quizData && typeof playerRef.current.getPlayerState === 'function' && playerRef.current.getPlayerState() === 1) {
        const currentTime = playerRef.current.getCurrentTime();
        // Logika poprawnie używa 'timestamp' (liczby sekund) do sprawdzania czasu
        const nextQuizIndex = quizData.generatedQuizzes.findIndex((q, index) => index > lastShownQuizIndex && currentTime >= q.timestamp);
        if (nextQuizIndex !== -1) {
          playerRef.current.pauseVideo();
          setCurrentQuiz(quizData.generatedQuizzes[nextQuizIndex]);
          setShowQuiz(true);
          setLastShownQuizIndex(nextQuizIndex);
          setCurrentQuestionIndex(0);
          setAnsweredQuestionsCount(0); 
          setSelectedAnswer(null);
          setIsAnswerCorrect(null);
          setShowFeedback(false);
          setAwaitingAcknowledgment(false);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quizData, lastShownQuizIndex]);

  // Reszta logiki (handleAnswerClick, etc.) bez zmian...
  const handleAnswerClick = (option: string) => {
    if (selectedAnswer || !currentQuiz) return;
    const isCorrect = option === currentQuiz.questions[currentQuestionIndex].correctAnswer;
    setSelectedAnswer(option);
    setIsAnswerCorrect(isCorrect);
    setShowFeedback(true);
    setAnsweredQuestionsCount(prev => prev + 1);
    if (isCorrect) {
      setTimeout(() => {
        if (currentQuestionIndex < currentQuiz.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setIsAnswerCorrect(null);
          setShowFeedback(false);
        }
      }, 1500);
    } else {
      setAwaitingAcknowledgment(true);
    }
  };
  const handleAcknowledgeIncorrect = () => {
    if (!currentQuiz) return;
    setAwaitingAcknowledgment(false);
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setShowFeedback(false);
    } else {
      setShowQuiz(false);
      setCurrentQuiz(null);
      playerRef.current?.playVideo();
    }
  };
  useEffect(() => {
    if (
      currentQuiz && 
      answeredQuestionsCount === currentQuiz.questions.length && 
      !awaitingAcknowledgment
    ) {
      setTimeout(() => {
        setShowQuiz(false);
        setCurrentQuiz(null);
        playerRef.current?.playVideo();
      }, 2000); 
    }
  }, [answeredQuestionsCount, currentQuiz, awaitingAcknowledgment]);
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: { autoplay: 0, controls: 1 },
  };
  
  // Renderowanie
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

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];

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

        {showQuiz && currentQuiz && currentQuestion && (
          <div className={styles.quizOverlay}>
            <div className={`card ${styles.quizCard}`}>
              <div className="card-header">
                {/* <-- ZMIANA 2: Użycie sformatowanego czasu */}
                <h3>Quiz w {currentQuiz.timestampFormatted}</h3>
                <p className="mb-0">
                  Pytanie {currentQuestionIndex + 1} z {currentQuiz.questions.length}
                </p>
              </div>
              <div className="card-body">
                <div className={styles.questionBlock}>
                  <p><strong>Pytanie:</strong> {currentQuestion.questionText}</p>
                  <div className={styles.optionsContainer}>
                    {currentQuestion.options.map((option, optIndex) => {
                      let buttonClass = 'btn btn-outline-primary';
                      
                      if (selectedAnswer) {
                        if (option === currentQuestion.correctAnswer) {
                          buttonClass = 'btn btn-success';
                        } else if (option === selectedAnswer && !isAnswerCorrect) {
                          buttonClass = 'btn btn-danger';
                        }
                      }

                      return (
                        <button
                          key={optIndex}
                          className={buttonClass}
                          onClick={() => handleAnswerClick(option)}
                          disabled={!!selectedAnswer || awaitingAcknowledgment}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className={styles.feedbackMessage}>
                    {showFeedback && (
                      <>
                        {isAnswerCorrect ? (
                          <div className={`alert alert-success ${showFeedback ? 'visible' : ''}`}>
                            ✓ Poprawna odpowiedź!
                          </div>
                        ) : (
                          <div 
                            className={`alert alert-danger ${showFeedback ? 'visible' : ''} ${styles.clickableFeedback}`}
                            onClick={handleAcknowledgeIncorrect}
                          >
                            ✗ Niepoprawna odpowiedź. Poprawna to: {currentQuestion.correctAnswer}
                            <br />
                            <small><strong>(Kliknij, aby kontynuować)</strong></small>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className={styles.progressTracker}>
                  <p>Odpowiedzi: {answeredQuestionsCount} / {currentQuiz.questions.length}</p>
                  {answeredQuestionsCount === currentQuiz.questions.length && (
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

_     <h2>⏱️ Momenty Quizów</h2>
      <div className={`card ${styles.infoCard}`}>
        <div className="card-body">
          <p className={styles.quizTimeline}>
            W trakcie oglądania filmu pojawią się quizy w następujących momentach:
          </p>
          <div className={styles.timestampList}>
            {quizData.generatedQuizzes.map((quiz, index) => (
              <div key={index} className={styles.timestampItem}>
                {/* <-- ZMIANA 3: Użycie sformatowanego czasu */}
                <span className={styles.timestampBadge}>⏱️ {quiz.timestampFormatted}</span>
                <span className={styles.timestampText}>
                  Quiz z {quiz.questions.length} pytaniami
              _ </span>
              </div>
            ))}
          </div>
          <p className={styles.unlockInfo}>
            <strong>💡 Wskazówka:</strong> Odpowiedz na wszystkie pytania w quizie, aby kontynuować oglądanie.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayerPage;
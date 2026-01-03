import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubePlayer, YouTubeProps } from 'react-youtube';
import styles from './QuizPlayerPage.module.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
// Importujemy zaktualizowane funkcje z serwisu
import { getQuizById, updateQuizProgress } from '../../services/quizApi';

// Interfejsy danych
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
  completedQuestions?: string[]; 
}

const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

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

  // Funkcja pomocnicza do wyciągania ID wideo
  const getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };
  
  // Pobieranie danych quizu przy użyciu serwisu API
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        setError('Nie znaleziono ID quizu w adresie URL.');
        setIsLoading(false);
        return;
      }

      // Sprawdzenie czy użytkownik jest zalogowany
      if (!localStorage.getItem('token')) {
        navigate('/login');
        return;
      }

      try {
        const data = await getQuizById(quizId);
        const videoId = getYouTubeVideoId(data.youtubeUrl);
        
        if (!videoId) {
          throw new Error('Nieprawidłowy link do YouTube.');
        }

        data.youtubeVideoId = videoId;
        setQuizData(data);
        
        // Tutaj można by wczytać zapisany postęp z data.completedQuestions
      } catch (err: any) {
        console.error("Błąd pobierania danych:", err);
        setError(err.message || 'Wystąpił nieoczekiwany błąd.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuizData();
  }, [quizId, navigate]);

  // Monitorowanie czasu wideo
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

  // Obsługa kliknięcia odpowiedzi z zapisem postępu
  const handleAnswerClick = async (option: string) => {
    if (selectedAnswer || !currentQuiz || !quizId) return;

    const question = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = option === question.correctAnswer;
    
    setSelectedAnswer(option);
    setIsAnswerCorrect(isCorrect);
    setShowFeedback(true);
    setAnsweredQuestionsCount(prev => prev + 1);

    if (isCorrect) {
      // Jeśli odpowiedź jest poprawna, aktualizujemy postęp na serwerze
      try {
        // Logika lokalnego zapisu ID pytania (zakładając, że pytania mają _id)
        const progressId = question._id || `q_${currentQuestionIndex}`;
        await updateQuizProgress(quizId, [progressId]);
      } catch (err) {
        console.warn("Nie udało się zapisać postępu na serwerze.");
      }

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
    if (currentQuiz && answeredQuestionsCount === currentQuiz.questions.length && !awaitingAcknowledgment) {
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
  
  if (isLoading) return (
    <div className={styles.loadingContainer}>
      <div className="spinner-border" role="status"><span className="visually-hidden">Ładowanie...</span></div>
      <p>Ładowanie Twojej sesji nauki...</p>
    </div>
  );

  if (error) return <div className={`alert alert-danger m-5`} role="alert"><strong>Błąd:</strong> {error}</div>;
  if (!quizData) return <div className={`alert alert-warning m-5`} role="alert">Nie znaleziono danych quizu.</div>;

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];

  return (
    <div className={`container ${styles.quizContainer}`}>
      <h1>{quizData.documentFileName.split('.')[0]} - Sesja Nauki</h1>

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
                <h3>Quiz w {currentQuiz.timestampFormatted}</h3>
                <p className="mb-0">Pytanie {currentQuestionIndex + 1} z {currentQuiz.questions.length}</p>
              </div>
              <div className="card-body">
                <div className={styles.questionBlock}>
                  <p><strong>Pytanie:</strong> {currentQuestion.questionText}</p>
                  <div className={styles.optionsContainer}>
                    {currentQuestion.options.map((option, optIndex) => {
                      let buttonClass = 'btn btn-outline-primary';
                      if (selectedAnswer) {
                        if (option === currentQuestion.correctAnswer) buttonClass = 'btn btn-success';
                        else if (option === selectedAnswer && !isAnswerCorrect) buttonClass = 'btn btn-danger';
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
                      isAnswerCorrect ? (
                        <div className="alert alert-success">✓ Poprawna odpowiedź!</div>
                      ) : (
                        <div className={`alert alert-danger ${styles.clickableFeedback}`} onClick={handleAcknowledgeIncorrect}>
                          ✗ Niepoprawna odpowiedź. Poprawna to: {currentQuestion.correctAnswer}
                          <br /><small><strong>(Kliknij, aby kontynuować)</strong></small>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Sekcja informacji o sesji */}
      <div className={`card ${styles.infoCard} mt-4`}>
        <div className="card-header">📋 Szczegóły Sesji</div>
        <div className="card-body">
          <p><strong>Dokument:</strong> {quizData.documentFileName}</p>
          <p><strong>Status:</strong> Sesja zapisana automatycznie</p>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayerPage;
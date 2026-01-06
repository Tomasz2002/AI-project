import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyQuizzes } from '../../services/quizApi';
import styles from './SessionPage.module.scss';

interface IQuizSummary {
  _id: string;
  documentFileName: string;
  youtubeVideoId: string;
  createdAt: string;
}

const SessionsPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<IQuizSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const data = await getMyQuizzes();
        setQuizzes(data);
      } catch (err) {
        console.error("Błąd podczas ładowania sesji:", err);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, []);

  if (loading) return (
    <div className="container mt-5 text-center">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">Ładowanie Twoich sesji...</p>
    </div>
  );

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Twoje Sesje Nauki</h2>
        <Link to="/create-quiz" className="btn btn-success">Nowa Sesja</Link>
      </div>
      
      {quizzes.length === 0 ? (
        <div className="alert alert-info py-5 text-center">
          <h4>Nie masz jeszcze żadnych sesji.</h4>
          <p>Wklej link do YouTube i dodaj notatki, aby zacząć naukę!</p>
          <Link to="/create-quiz" className="btn btn-primary mt-2">Stwórz pierwszy quiz</Link>
        </div>
      ) : (
        <div className="row">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="col-md-4 mb-4">
              <div className={`card h-100 shadow-sm ${styles.sessionCard}`}>
                <div className={styles.thumbnailWrapper}>
                  <img 
                    src={`https://img.youtube.com/vi/${quiz.youtubeVideoId}/mqdefault.jpg`} 
                    className="card-img-top" 
                    alt="YouTube Thumbnail" 
                  />
                  <div className={styles.playOverlay}>▶</div>
                </div>
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title text-truncate" title={quiz.documentFileName}>
                    {quiz.documentFileName.split('.')[0]}
                  </h5>
                  <p className="card-text text-muted small mt-auto">
                    {/* ZMIANA: Dodano toLocaleString() dla wyświetlenia daty i godziny */}
                    📅 Utworzono: {new Date(quiz.createdAt).toLocaleString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <Link to={`/quiz/${quiz._id}`} className="btn btn-outline-primary w-100 mt-2">
                    Kontynuuj naukę
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
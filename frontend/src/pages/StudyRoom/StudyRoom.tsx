import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import styles from './StudyRoom.module.scss';

const StudyRoom: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [results, setResults] = useState<any[] | null>(null);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);

  useEffect(() => {
    const s = io('http://localhost:3000/study');
    setSocket(s);

    s.on('roomUpdated', (state) => setRoomState(state));
    s.on('questionStarted', (data) => {
      setCurrentQuestion(data.question);
      setTimeLeft(data.timeLeft);
      setMyAnswer(null);
    });
    s.on('timerTick', (time) => setTimeLeft(time));
    s.on('playerAnswered', (data) => {
      setRoomState((prev: any) => ({
        ...prev,
        players: prev.players.map((p: any) => 
          p.id === data.playerId ? { ...p, currentAnswer: data.answer } : p
        )
      }));
    });
    s.on('quizEnded', (finalPlayers) => setResults(finalPlayers));

    return () => {
      s.disconnect();
    };
  }, []);

  const handleJoinOrCreate = () => {
    const userName = prompt('Podaj swoje imię:') || 'Gracz';
    const roomId = prompt('Podaj kod pokoju (zostaw puste, by stworzyć nowy):');

    if (roomId) {
      socket?.emit('joinRoom', { roomId, name: userName }, (res: any) => {
        if (res.error) alert(res.error);
        else setRoomState(res.state);
      });
    } else {
      socket?.emit('createRoom', { quizId, name: userName }, (res: any) => {
        setRoomState(res.state);
      });
    }
  };

  const submitAnswer = (answer: string) => {
    if (myAnswer) return;
    setMyAnswer(answer);
    socket?.emit('submitAnswer', { roomId: roomState.roomId, answer });
  };

  if (results) {
    return (
      <div className={styles.roomContainer}>
        <div className={styles.resultsWrapper}>
          <h2>🏆 Wyniki Rywalizacji</h2>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <BarChart data={results} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                  {results.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ffc107' : '#007bff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Zagraj Ponownie</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roomContainer}>
      {!roomState ? (
        <div className="text-center">
          <h2>Tryb Wspólnej Nauki</h2>
          <p>Rywalizuj z maksymalnie 5 osobami w czasie rzeczywistym.</p>
          <button onClick={handleJoinOrCreate} className="btn btn-lg btn-primary">Dołącz lub Stwórz Pokój</button>
        </div>
      ) : (
        <div className={styles.activeRoom}>
          <div className={styles.header}>
            <div>
              <h3>Pokój: <span className="badge bg-dark">{roomState.roomId}</span></h3>
            </div>
            <div className={styles.timer}>⏳ {timeLeft}s</div>
          </div>

          <div className={styles.playersList}>
            {roomState.players.map((p: any) => (
              <div key={p.id} className={styles.playerBadge}>
                <span className={styles.statusIcon}>{p.currentAnswer ? '✅' : '🕒'}</span>
                <strong>{p.name}</strong>: {p.score} pkt
              </div>
            ))}
          </div>

          {currentQuestion ? (
            <div className={styles.questionCard}>
              <p className="text-muted">Pytanie {roomState.currentQuestionIndex + 1}</p>
              <h4>{currentQuestion.questionText}</h4>
              <div className={styles.options}>
                {currentQuestion.options.map((opt: string) => (
                  <button 
                    key={opt}
                    disabled={!!myAnswer}
                    onClick={() => submitAnswer(opt)}
                    className={`btn ${myAnswer === opt ? 'btn-primary' : 'btn-outline-primary'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {myAnswer && (
                <div className="mt-4">
                  {myAnswer === currentQuestion.correctAnswer ? 
                    <div className="alert alert-success">Świetnie! Czekamy na pozostałych graczy...</div> : 
                    <div className="alert alert-danger">Niestety to nie ta odpowiedź. Poprawna: {currentQuestion.correctAnswer}</div>
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-5">
              <h4>Oczekiwanie na start...</h4>
              {roomState.players[0].id === socket?.id && (
                <button onClick={() => socket?.emit('startQuiz', { roomId: roomState.roomId })} className="btn btn-success btn-lg mt-3">
                  Uruchom Quiz dla wszystkich
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyRoom;
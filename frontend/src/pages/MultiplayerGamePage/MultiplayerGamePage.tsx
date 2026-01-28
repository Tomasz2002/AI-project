import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socketService';
import styles from './MultiplayerGamePage.module.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Player {
    id: string;
    username: string;
    score: number;
}

const MultiplayerGamePage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    // State
    const [quizData, setQuizData] = useState<any>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(20);
    const [isQuestionActive, setIsQuestionActive] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameOver, setGameOver] = useState(false);

    // Reveal Phase State
    const [isRevealing, setIsRevealing] = useState(false);
    const [roundResults, setRoundResults] = useState<{
        correctAnswer: string;
        answers: Record<string, string>;
    } | null>(null);

    useEffect(() => {
        if (location.state?.quizData) {
            setQuizData(location.state.quizData);
        }
    }, [location.state]);

    useEffect(() => {
        const socket = socketService.getSocket();

        socket.on('updatePlayerList', (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers);
        });

        socket.on('roundFinished', (data: any) => {
            // Trigger Reveal Phase
            setIsQuestionActive(false);
            setIsRevealing(true);
            setRoundResults({
                correctAnswer: data.correctAnswer,
                answers: data.answers
            });
            setPlayers(data.players); // Update scores provided by backend

            // Wait 5 seconds then next question
            setTimeout(() => {
                setIsRevealing(false);
                setRoundResults(null);
                if (data.nextQuestionIndex < (quizQuestions.length)) {
                    setCurrentQuestionIndex(data.nextQuestionIndex);
                    setSelectedAnswer(null);
                    setTimeLeft(20);
                    setIsQuestionActive(true);
                } else {
                    setGameOver(true);
                }
            }, 5000);
        });

        if (!gameOver) {
            setIsQuestionActive(true);
        }

        return () => {
            socket.off('updatePlayerList');
            socket.off('roundFinished');
        };
    }, [quizData]); // Re-bind if quizData loads? careful with loops. 
    // Actually empty dependency [] is better but we use quizQuestions length inside timeout.
    // Use refs or functional updates if needed, but quizData is stable after load.

    // Timer Logic
    useEffect(() => {
        if (!isQuestionActive || gameOver || isRevealing) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time up! If we are host, maybe force round finish? 
                    // Or just wait. Backend should ideally have a timer too.
                    // For now, let's just disable input.
                    // handleTimeUp(); // Rely on backend or local transition?
                    // If we rely on backend 'roundFinished', we just stop locally.
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isQuestionActive, gameOver, isRevealing]);


    const handleAnswer = (option: string) => {
        if (selectedAnswer || !isQuestionActive || isRevealing) return;
        setSelectedAnswer(option);

        const socket = socketService.getSocket();
        socket.emit('submitAnswer', { roomId, answer: option, timeRemaining: timeLeft });
        // No syncScore emit anymore
    };

    const quizQuestions = quizData?.questions || quizData?.generatedQuizzes?.[0]?.questions || [];
    const currentQuestion = quizQuestions[currentQuestionIndex];

    if (!quizData) return <div className="text-center mt-5">Ładowanie danych gry...</div>;

    if (gameOver) {
        return (
            <div className={`container ${styles.gameContainer}`}>
                <div className="card shadow-lg p-4">
                    <h1 className="text-center mb-4">Wyniki</h1>
                    <div style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={players} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="username" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="score" fill="#8884d8" name="Punkty" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Wróć do strony głównej</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`container ${styles.gameContainer}`}>
            <div className="row">
                {/* Main Game Area */}
                <div className="col-lg-8 mb-4">
                    <div className={`card ${styles.questionCard}`}>
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <span className="badge bg-primary">Pytanie {currentQuestionIndex + 1}/{quizQuestions.length}</span>
                            <div className={styles.timer}>
                                {isRevealing ? 'Wyniki Rundy' : `${timeLeft}s`}
                            </div>
                        </div>
                        <div className="card-body">
                            <h4 className="mb-4">{currentQuestion?.questionText}</h4>
                            <div className="d-grid gap-2">
                                {currentQuestion?.options.map((opt: string, idx: number) => {
                                    // Determine style based on reveal state
                                    let btnClass = 'btn-outline-dark';
                                    let content = opt;

                                    if (isRevealing && roundResults) {
                                        if (opt === roundResults.correctAnswer) {
                                            btnClass = 'btn-success'; // Correct
                                        } else if (opt === selectedAnswer && opt !== roundResults.correctAnswer) {
                                            btnClass = 'btn-danger'; // Wrong selection
                                        }

                                        // Optional: Show who picked this?
                                        // Filter players who picked this 'opt'
                                        // (Requires iterating roundResults.answers)
                                    } else {
                                        if (selectedAnswer === opt) btnClass = 'active btn-primary';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={`btn ${btnClass} p-3 text-start position-relative`}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={!!selectedAnswer || isRevealing}
                                        >
                                            {content}
                                            {isRevealing && roundResults && (
                                                <div className="position-absolute end-0 top-50 translate-middle-y me-3 d-flex gap-1">
                                                    {Object.entries(roundResults.answers)
                                                        .filter(([pid, ans]) => ans === opt)
                                                        .map(([pid, ans]) => {
                                                            const p = players.find(pl => pl.id === pid);
                                                            return p ? (
                                                                <span key={pid} className="badge bg-light text-dark border border-secondary" title={p.username}>
                                                                    {p.username.charAt(0)}
                                                                </span>
                                                            ) : null;
                                                        })
                                                    }
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Leaderboard */}
                <div className="col-lg-4">
                    <div className="card">
                        <div className="card-header bg-light fw-bold">Ranking na żywo</div>
                        <ul className="list-group list-group-flush">
                            {[...players].sort((a, b) => b.score - a.score).map((player, idx) => (
                                <li key={player.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>
                                        <span className="badge bg-secondary me-2">{idx + 1}</span>
                                        {player.username}
                                    </span>
                                    <span className="fw-bold text-primary">{player.score} pkt</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="alert alert-info mt-3 small">
                        {isRevealing ? 'Sprawdzanie wyników...' : 'Gra trwa! Odpowiadaj szybko.'}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default MultiplayerGamePage;

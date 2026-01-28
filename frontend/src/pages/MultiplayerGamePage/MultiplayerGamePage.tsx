import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { socketService } from '../../services/socketService';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './MultiplayerGamePage.module.scss';


interface Player {
    id: string;
    username: string;
    score: number;
    isHost?: boolean;
}

const MultiplayerGamePage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    // State
    const [quizData, setQuizData] = useState<any>(null);
    const [players, setPlayers] = useState<Player[]>([]);

    // Game State
    const [gameState, setGameState] = useState<'VIDEO' | 'QUESTION' | 'REVEAL'>('VIDEO');
    const [isHost, setIsHost] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    // Question State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(20);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    // Reveal State
    const [roundResults, setRoundResults] = useState<{
        correctAnswer: string;
        answers: Record<string, string>;
    } | null>(null);

    // Video Refs
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [currentTime, setCurrentTime] = useState(0);

    // Debug: Force update time for UI
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current) {
                setCurrentTime(playerRef.current.getCurrentTime());
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // 1. Init & Socket Listeners
    useEffect(() => {
        if (location.state?.quizData) {
            setQuizData(location.state.quizData);
        }

        const socket = socketService.getSocket();

        // Host determination
        socket.on('updatePlayerList', (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers);
            const me = updatedPlayers.find(p => p.id === socket.id);
            if (me?.isHost) setIsHost(true);
            else if (updatedPlayers.length > 0 && updatedPlayers[0].id === socket.id && !updatedPlayers.some(p => p.isHost)) {
                setIsHost(true);
            }
        });

        // --- VIDEO EVENTS ---
        socket.on('syncVideo', (data: { state: 'play' | 'pause', time: number }) => {
            if (!playerRef.current) return;
            const diff = Math.abs(playerRef.current.getCurrentTime() - data.time);
            if (diff > 2) playerRef.current.seekTo(data.time, true);

            if (data.state === 'play') playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
        });

        socket.on('showQuestion', (data: { questionIndex: number }) => {
            setGameState('QUESTION');
            setCurrentQuestionIndex(data.questionIndex);
            setTimeLeft(20);
            setSelectedAnswer(null);
            if (playerRef.current) playerRef.current.pauseVideo();
        });

        socket.on('resumeVideo', () => {
            setGameState('VIDEO');
            setRoundResults(null);
            if (playerRef.current) playerRef.current.playVideo();
        });

        socket.on('roundFinished', (data: any) => {
            setGameState('REVEAL');
            setRoundResults({
                correctAnswer: data.correctAnswer,
                answers: data.answers
            });
            setPlayers(data.players);
            if (data.nextQuestionIndex !== undefined) setCurrentQuestionIndex(data.nextQuestionIndex);
        });

        socket.on('gameEnded', (data: any) => {
            setPlayers(data.players);
            setGameOver(true);
        });

        socket.emit('getRoomInfo', { roomId });

        return () => {
            socket.off('updatePlayerList');
            socket.off('syncVideo');
            socket.off('showQuestion');
            socket.off('resumeVideo');
            socket.off('roundFinished');
            socket.off('gameEnded');
        };
    }, [location.state, roomId]);

    // 2. Timer
    useEffect(() => {
        if (gameState !== 'QUESTION') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    // 3. Host Logic (Time Check)
    useEffect(() => {
        if (!isHost || gameState !== 'VIDEO' || !quizData) return;

        const interval = setInterval(() => {
            // Check playerRef inside logic
            if (!playerRef.current) return;

            const currentTime = playerRef.current.getCurrentTime();
            const questions = quizData.questions || quizData.generatedQuizzes?.[0]?.questions || [];
            const nextQ = questions[currentQuestionIndex];

            if (nextQ && nextQ.timestamp !== undefined) {
                // Relaxed check: Just check if we passed the timestamp
                // The gameState !== 'VIDEO' check protecting this block prevents loops
                if (currentTime >= nextQ.timestamp) {
                    const socket = socketService.getSocket();
                    console.log('Front Host: Triggering question', currentQuestionIndex);
                    socket.emit('triggerQuestion', { roomId, questionIndex: currentQuestionIndex });
                }
            }
        }, 500);

        return () => clearInterval(interval);
    }, [isHost, gameState, quizData, currentQuestionIndex]);


    const handleVideoStateChange = (e: any) => {
        if (!isHost) return;
        const socket = socketService.getSocket();
        const state = e.data === 1 ? 'play' : 'pause';
        if (gameState === 'VIDEO') {
            socket.emit('videoStateChange', { roomId, state, time: e.target.getCurrentTime() });
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedAnswer || gameState !== 'QUESTION') return;
        setSelectedAnswer(option);
        const socket = socketService.getSocket();
        socket.emit('submitAnswer', { roomId, answer: option, timeRemaining: timeLeft });
    };

    const handleHostResume = () => {
        const socket = socketService.getSocket();
        socket.emit('resumeSession', { roomId });
    };

    const handleHostFinish = () => {
        const socket = socketService.getSocket();
        if (window.confirm('Czy na pewno chcesz zakończyć sesję dla wszystkich?')) {
            socket.emit('finishGame', { roomId });
        }
    };


    if (!quizData) return <div className={styles.loadingContainer}><div className="spinner-border" role="status"><span className="visually-hidden">Ładowanie...</span></div></div>;

    if (gameOver) return (
        <div className={`container ${styles.quizContainer} d-flex flex-column align-items-center justify-content-center`}>
            <h1>Koniec Gry</h1>
            <div className={`card ${styles.quizCard} p-4 w-100`} style={{ maxWidth: '600px' }}>
                <h3 className="text-center mb-4">Ranking Końcowy</h3>
                <ul className="list-group mb-4">
                    {players.sort((a, b) => b.score - a.score).map((p, i) => (
                        <li key={i} className={`list-group-item d-flex justify-content-between align-items-center ${i === 0 ? 'bg-warning bg-opacity-25' : ''}`}>
                            <span>#{i + 1} <strong>{p.username}</strong></span>
                            <span className="badge bg-primary rounded-pill">{p.score} pkt</span>
                        </li>
                    ))}
                </ul>
                <button className="btn btn-primary w-100 py-2" onClick={() => navigate('/')}>Wróć do Menu</button>
            </div>
        </div>
    );

    const videoId = quizData.youtubeVideoId || 'aARsNGL-Xwc';
    const questions = quizData.questions || [];
    const displayIndex = gameState === 'REVEAL' ? currentQuestionIndex - 1 : currentQuestionIndex;
    const currentQ = questions[displayIndex];

    return (
        <div className={styles.quizContainer}>
            {/* Header */}
            <div>
                <h1>Biologia - Układ Słoneczny</h1>
                <div className="d-flex justify-content-center gap-3 mb-4">
                    <span className="badge bg-secondary fs-6 p-2">PIN: {roomId}</span>
                    <span className="badge bg-primary fs-6 p-2">Graczy: {players.length}</span>
                    {isHost && (
                        <button className="btn btn-danger btn-sm fw-bold" onClick={handleHostFinish}>ZAKOŃCZ SESJĘ</button>
                    )}
                </div>
            </div>

            {/* Video Wrapper */}
            <div className={styles.playerAndQuizWrapper}>
                <div className={styles.videoWrapper}>
                    <YouTube
                        videoId={videoId}
                        className={styles.youtubePlayer}
                        opts={{
                            width: '100%',
                            height: '100%',
                            playerVars: {
                                controls: isHost ? 1 : 0,
                                disablekb: !isHost ? 1 : 0,
                                rel: 0,
                                modestbranding: 1
                            }
                        }}
                        onStateChange={handleVideoStateChange}
                        onReady={(e) => playerRef.current = e.target}
                    />

                    {/* Blocker for guests */}
                    {!isHost && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }} onClick={(e) => e.stopPropagation()}></div>
                    )}
                </div>

                {/* Question Overlay (Fixed Modal) */}
                {(gameState === 'QUESTION' || gameState === 'REVEAL') && (
                    <div className={styles.quizOverlay}>
                        <div className={styles.quizCard}>
                            <div className="card-header">
                                <h3>{gameState === 'QUESTION' ? `Pytanie (${timeLeft}s)` : 'Wyniki'}</h3>
                                <p>Pytanie {currentQuestionIndex + (gameState === 'QUESTION' ? 1 : 0)}</p>
                            </div>
                            <div className="card-body">
                                <div className={styles.questionBlock}>
                                    <p><strong>Pytanie:</strong> {currentQ?.questionText}</p>

                                    <div className={styles.optionsContainer}>
                                        {currentQ?.options.map((opt: string, idx: number) => {
                                            let buttonClass = '';
                                            // Since styles are scoped, we use bootstrap classes mixed with style overrides? 
                                            // The css uses specific selectors. Let's rely on the module class 'optionsContainer > button'
                                            // But we need to add conditional classes manually if module doesn't cover them.
                                            // Actually module has .optionsContainer button handle standard look.
                                            // We need inline styles or extra classes for state.

                                            // wait, the module 'optionsContainer button' handles base style.
                                            // We need to override background for active/correct/wrong.

                                            let styleOverride = {};
                                            if (gameState === 'REVEAL' && roundResults) {
                                                if (opt === roundResults.correctAnswer) styleOverride = { background: '#28a745', color: 'white', borderColor: '#28a745' };
                                                else if (opt === selectedAnswer && opt !== roundResults.correctAnswer) styleOverride = { background: '#dc3545', color: 'white', borderColor: '#dc3545' };
                                                else styleOverride = { opacity: 0.5 };
                                            } else if (selectedAnswer === opt) {
                                                // Highlighting selected
                                                styleOverride = { background: '#007bff', color: 'white' };
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleAnswer(opt)}
                                                    disabled={gameState !== 'QUESTION' || !!selectedAnswer}
                                                    style={styleOverride}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {gameState === 'REVEAL' && (
                                        <div className={styles.feedbackMessage}>
                                            <div className={`alert alert-info visible w-100`}>
                                                <strong>Wyjaśnienie:</strong> {currentQ?.explanation}
                                                {isHost && (
                                                    <div className="mt-2 text-center">
                                                        <button className="btn btn-warning fw-bold" onClick={handleHostResume}>WZNÓW GRĘ</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Cards / Timeline */}
            <div className={`card ${styles.infoCard} mt-4`}>
                <div className="card-header">⏱️ Oś czasu quizów</div>
                <div className="card-body">
                    <div className={styles.timestampList}>
                        {(quizData?.questions || []).map((q: any, idx: number) => {
                            const isPast = idx < currentQuestionIndex;
                            const isCurrent = idx === currentQuestionIndex;
                            const formatTime = (s: number) => {
                                const m = Math.floor(s / 60);
                                const sec = s % 60;
                                return `${m}:${sec < 10 ? '0' : ''}${sec}`;
                            };

                            return (
                                <div key={idx} className={styles.timestampItem}>
                                    <span className={styles.timestampBadge}>
                                        {formatTime(q.timestamp)}
                                    </span>
                                    <span className={styles.timestampText}>
                                        {isPast ? (
                                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Ukończone</span>
                                        ) : (isCurrent && gameState !== 'VIDEO' ? (
                                            <span style={{ color: '#ffc107', fontWeight: 'bold' }}>🔥 TERAZ</span>
                                        ) : (
                                            <span style={{ color: '#6c757d' }}>⏳ Oczekuje</span>
                                        ))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Leaderboard Card */}
            <div className={`card ${styles.infoCard} mt-4`}>
                <div className="card-header">🏆 Ranking Graczy</div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2">
                        {players.sort((a, b) => b.score - a.score).map((p, i) => (
                            <span key={i} className={`badge ${i === 0 ? 'bg-warning text-dark' : 'bg-light text-dark border'} p-2 fs-6`}>
                                #{i + 1} {p.username}: {p.score}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MultiplayerGamePage;

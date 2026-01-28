import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { socketService } from '../../services/socketService';
import 'bootstrap/dist/css/bootstrap.min.css';

// Styles matching QuizPlayerPage aesthetic
const pageStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: 'white'
};

const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    borderRadius: '8px' // Match rounded corners of video container if applicable
};

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

        socket.emit('getRoomInfo', { roomId });

        return () => {
            socket.off('updatePlayerList');
            socket.off('syncVideo');
            socket.off('showQuestion');
            socket.off('resumeVideo');
            socket.off('roundFinished');
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
        if (!isHost || gameState !== 'VIDEO' || !quizData || !playerRef.current) return;

        const interval = setInterval(() => {
            const currentTime = playerRef.current.getCurrentTime();
            const questions = quizData.questions || quizData.generatedQuizzes?.[0]?.questions || [];
            const nextQ = questions[currentQuestionIndex];

            if (nextQ && nextQ.timestamp !== undefined) {
                if (currentTime >= nextQ.timestamp && currentTime < nextQ.timestamp + 1.5) {
                    const socket = socketService.getSocket();
                    socket.emit('triggerQuestion', { roomId, questionIndex: currentQuestionIndex });
                }
            }
        }, 200);

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
        const totalQ = (quizData?.questions || []).length;
        if (currentQuestionIndex >= totalQ) setGameOver(true);
        else socket.emit('resumeSession', { roomId });
    };


    if (!quizData) return <div className="text-white bg-dark vh-100 d-flex align-items-center justify-content-center">Ładowanie danych...</div>;

    if (gameOver) return (
        <div className="bg-dark text-white vh-100 d-flex flex-column align-items-center justify-content-center">
            <h1>Koniec Gry</h1>
            <h3>Ranking Końcowy</h3>
            <ul>
                {players.sort((a, b) => b.score - a.score).map((p, i) => <li key={i}>{p.username}: {p.score}</li>)}
            </ul>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Wróć</button>
        </div>
    );

    const videoId = quizData.youtubeVideoId || 'aARsNGL-Xwc';
    const questions = quizData.questions || [];
    const displayIndex = gameState === 'REVEAL' ? currentQuestionIndex - 1 : currentQuestionIndex;
    const currentQ = questions[displayIndex];

    return (
        <div style={pageStyle}>
            {/* Header / Top Bar */}
            <div className="container-fluid py-3 border-bottom border-secondary d-flex justify-content-between align-items-center bg-dark">
                <div className="h4 mb-0 text-primary">Biologia - Układ Słoneczny</div>
                <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-secondary fs-5">PIN: {roomId}</span>
                    <span className="badge bg-primary fs-5">Graczy: {players.length}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container my-4 flex-grow-1 d-flex flex-column align-items-center">

                {/* Video Container - Boxed like QuizPlayerPage */}
                <div className="ratio ratio-16x9 shadow-lg rounded overflow-hidden position-relative" style={{ maxWidth: '900px', width: '100%', backgroundColor: '#000' }}>
                    <YouTube
                        videoId={videoId}
                        className="w-100 h-100"
                        opts={{
                            width: '100%',
                            height: '100%',
                            playerVars: {
                                controls: isHost ? 1 : 0, // Restore host-only controls
                                disablekb: !isHost,
                                rel: 0,
                                modestbranding: 1
                            }
                        }}
                        onStateChange={handleVideoStateChange}
                        onReady={(e) => playerRef.current = e.target}
                    />

                    {/* OVERLAY - Inside the Video Box */}
                    {(gameState === 'QUESTION' || gameState === 'REVEAL') && (
                        <div style={overlayStyle}>
                            <div className="p-4 text-center w-100">
                                <h2 className="mb-4 text-warning">{gameState === 'QUESTION' ? `Pytanie (${timeLeft}s)` : 'Wyniki'}</h2>
                                <h4 className="mb-4 text-white">{currentQ?.questionText}</h4>

                                <div className="row g-2 justify-content-center">
                                    {currentQ?.options.map((opt: string, idx: number) => {
                                        let bg = 'btn-outline-light';
                                        if (gameState === 'REVEAL' && roundResults) {
                                            if (opt === roundResults.correctAnswer) bg = 'btn-success';
                                            else if (opt === selectedAnswer && opt !== roundResults.correctAnswer) bg = 'btn-danger';
                                            else bg = 'btn-secondary opacity-50';
                                        } else if (selectedAnswer === opt) {
                                            bg = 'btn-primary';
                                        }

                                        return (
                                            <div key={idx} className="col-12 col-md-6">
                                                <button className={`btn ${bg} w-100 py-2`} onClick={() => handleAnswer(opt)} disabled={gameState !== 'QUESTION' || !!selectedAnswer}>
                                                    {opt}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>

                                {gameState === 'REVEAL' && (
                                    <div className="mt-4">
                                        <p className="text-info bg-dark d-inline-block px-3 py-1 rounded border border-info">
                                            {currentQ?.explanation}
                                        </p>
                                        {isHost && (
                                            <div className="mt-2">
                                                <button className="btn btn-warning px-5 fw-bold" onClick={handleHostResume}>WZNÓW GRĘ</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Text below video */}
                <div className="text-muted mt-2 text-center">
                    {gameState === 'VIDEO' ? 'Oglądaj wideo - Pytanie pojawi się wkrótce...' : 'Odpowiedz na pytanie!'}
                </div>

            </div>

            {/* Bottom Leaderboard Section */}
            <div className="bg-dark border-top border-secondary py-3">
                <div className="container">
                    <h5 className="text-center text-muted mb-3">Ranking Graczy</h5>
                    <div className="d-flex flex-wrap justify-content-center gap-4">
                        {players.sort((a, b) => b.score - a.score).map((p, i) => (
                            <div key={p.id} className="text-center bg-secondary bg-opacity-10 p-2 rounded px-4">
                                <span className={`badge ${i === 0 ? 'bg-warning text-dark' : 'bg-secondary'} me-2`}>{i + 1}</span>
                                <span className="fw-bold fs-5">{p.username}</span>
                                <div className="small text-muted">{p.score} pkt</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MultiplayerGamePage;

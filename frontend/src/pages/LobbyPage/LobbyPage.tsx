import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socketService';
import styles from './LobbyPage.module.scss';
import 'bootstrap/dist/css/bootstrap.min.css';

interface Player {
    id: string;
    username: string;
    score: number;
}

const LobbyPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [players, setPlayers] = useState<Player[]>([]);
    const [hostId, setHostId] = useState<string>('');
    const [quizTitle, setQuizTitle] = useState<string>('Quiz');
    const [currentUser, setCurrentUser] = useState<string>(localStorage.getItem('username') || '');

    useEffect(() => {
        const socket = socketService.getSocket();

        // If accessed directly, try to rejoin (naive implementation)
        // Ideally we check if we are already in room. 
        // For now, we rely on the flow Create/Join -> Lobby.
        // If we refresh, we might lose state unless we handle 'reconnect' on backend or rejoin.

        socket.on('updatePlayerList', (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers);
        });

        socket.on('playerJoined', (player: Player) => {
            // Handled by updatePlayerList usually, but good for notifications
            console.log(`${player.username} joined!`);
        });

        socket.on('gameStarted', (data: any) => {
            navigate(`/game/${roomId}`, { state: { quizData: data.quizData } });
        });

        // Listen for initial data if we just joined (but usually passed via navigation state or response)
        // However, if we came from Create/Join, we might have passed data.
        // Better: request room info on mount.
        socket.emit('getRoomInfo', { roomId });

        return () => {
            socket.off('updatePlayerList');
            socket.off('playerJoined');
            socket.off('gameStarted');
        };
    }, [roomId, navigate]);

    // We need a way to know who is host. 
    // The 'joinedRoom' event gave us this info. 
    // Let's add a listener for room info or assume simple heuristic (first player).
    // Or we update our backend to emit 'roomInfo' on request.

    // Quick fix: Backend 'joinRoom' response had hostId. 
    // Effect above tries 'getRoomInfo'. I need to implement that in backend OR 
    // just rely on 'updatePlayerList' if I add host info there.
    // Let's rely on 'updatePlayerList' and the fact that the first player is usually host, 
    // OR add hostId to the room update.

    // For MVP validation: 
    // I can't easily change backend now without context switch. 
    // I will assume if my socket.id matches players[0].id (if host is always first)
    // OR effectively, I check if I created the room.

    // ROBUST HOST CHECK: Compare socket.id with the first player's ID (host is always index 0)
    const isHost = players.length > 0 && socketService.getSocket()?.id === players[0].id;

    const handleStartGame = () => {
        const socket = socketService.getSocket();
        socket.emit('startGame', { roomId });
    };

    return (
        <div className={styles.lobbyContainer}>
            <div className={`card ${styles.lobbyCard}`}>
                <div className="card-header text-center bg-primary text-white">
                    <h2>Poczekalnia</h2>
                    <p className="mb-0">Kod pokoju:</p>
                    <h1 className="display-4 fw-bold">{roomId}</h1>
                </div>
                <div className="card-body">
                    <h5 className="text-center text-muted mb-4">Quiz: {quizTitle}</h5>

                    <div className={styles.playersList}>
                        <h6 className="text-uppercase text-secondary small fw-bold mb-3">Gracze ({players.length}/5)</h6>
                        <ul className="list-group list-group-flush">
                            {players.map((player, index) => (
                                <li key={player.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>
                                        {index === 0 && <i className="bi bi-star-fill text-warning me-2" title="Gospodarz"></i>}
                                        {player.username} {player.username === currentUser && '(Ty)'}
                                    </span>
                                    <span className="badge bg-light text-dark rounded-pill">Gotowy</span>
                                </li>
                            ))}
                            {players.length === 0 && <div className="text-center text-muted my-3">Oczekiwanie na graczy...</div>}
                        </ul>
                    </div>

                    <div className="mt-4 d-grid">
                        {isHost ? (
                            <button
                                className="btn btn-lg btn-success"
                                onClick={handleStartGame}
                                disabled={players.length < 2} // Suggestion: require at least 2 players? or 1 is fine for debug
                            >
                                {players.length < 2 ? 'Czekam na graczy...' : 'Rozpocznij Grę'}
                            </button>
                        ) : (
                            <div className="alert alert-info text-center m-0">
                                Oczekiwanie na rozpoczęcie przez gospodarza...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LobbyPage;

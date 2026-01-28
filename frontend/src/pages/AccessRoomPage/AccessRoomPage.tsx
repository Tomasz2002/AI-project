import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AccessRoomPage.module.scss';
import { socketService } from '../../services/socketService';

const AccessRoomPage: React.FC = () => {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const handleCreateRoom = () => {
        navigate('/create-room');
    };

    const handleJoinRoom = () => {
        if (!joinCode.trim()) {
            setError('Wpisz kod pokoju');
            return;
        }
        if (!nickname.trim()) {
            setError('Wpisz swój nick');
            return;
        }

        setIsJoining(true);
        setError('');

        const socket = socketService.connect();

        // Setup listener
        socket.once('joinedRoom', (response: any) => {
            if (response?.data?.roomId) {
                navigate(`/lobby/${response.data.roomId}`);
            } else {
                setError('Błąd dołączania (nieprawidłowa odpowiedź)');
                setIsJoining(false);
            }
        });

        socket.emit('joinRoom', {
            roomId: joinCode.toUpperCase(),
            username: nickname // Use the temporary nickname
        }, (response: any) => {
            // Optional: Handle error from Ack if validation failed on server before emit
            if (response?.error) {
                setError(response.error);
                setIsJoining(false);
                socket.off('joinedRoom'); // Cleanup if error
            }
        });

        // Fallback or additional listeners should be in Lobby
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className="mb-4 text-center">Tryb Wieloosobowy</h1>

                <div className="d-flex flex-column gap-4">
                    <div className={styles.optionBlock}>
                        <h3>Dołącz do gry</h3>
                        <p className="text-muted">Masz kod od znajomego? Wpisz poniżej.</p>

                        <div className="mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Twój Nick (np. Marek)"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                maxLength={12}
                            />
                        </div>

                        <div className="input-group mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="KOD POKOJU"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleJoinRoom}
                                disabled={isJoining}
                            >
                                {isJoining ? 'Dołączanie...' : 'Dołącz'}
                            </button>
                        </div>
                        {error && <div className="text-danger">{error}</div>}
                    </div>

                    <div className={styles.separator}>LUB</div>

                    <div className={styles.optionBlock}>
                        <h3>Stwórz nowy pokój</h3>
                        <p className="text-muted">Zostań gospodarzem, wybierz wideo i pytania.</p>
                        <button
                            className="btn btn-success w-100 p-3 fw-bold"
                            onClick={handleCreateRoom}
                        >
                            Stwórz Pokój
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessRoomPage;

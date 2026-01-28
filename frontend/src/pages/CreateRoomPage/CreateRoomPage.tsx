import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateRoomPage.module.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import { uploadMaterials, generateQuiz, getQuizById } from '../../services/quizApi';
import { socketService } from '../../services/socketService';
import { PDFDocument } from 'pdf-lib';

// Reusing types and basic logic from FormPage
interface FormErrors {
    youtubeUrl?: string;
    file?: string;
    pageRange?: string;
}

const CreateRoomPage: React.FC = () => {
    // --- DEBUG: MOCK DATA CONFIGURATION ---
    const USE_MOCK_DATA = true; // Set to false to use real AI generation

    const mockQuizData = {
        _id: 'mock-quiz-id',
        timestamp: Date.now(),
        documentFileName: 'Testowy Quiz (Mock)',
        questions: [
            {
                questionText: 'Jakiego koloru jest niebo w słoneczny dzień?',
                options: ['Zielone', 'Niebieskie', 'Czerwone', 'Fioletowe'],
                correctAnswer: 'Niebieskie',
                explanation: 'Rozpraszanie Rayleigha powoduje, że niebo jest niebieskie.'
            },
            {
                questionText: 'Ile to 2 + 2?',
                options: ['3', '5', '4', '22'],
                correctAnswer: '4',
                explanation: 'Podstawowa matematyka.'
            },
            {
                questionText: 'Stolica Polski to:',
                options: ['Kraków', 'Gdańsk', 'Warszawa', 'Poznań'],
                correctAnswer: 'Warszawa',
                explanation: 'Warszawa jest stolicą Polski od 1596 roku.'
            }
        ]
    };
    // --------------------------------------

    const navigate = useNavigate();

    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [pageFrom, setPageFrom] = useState(1);
    const [pageTo, setPageTo] = useState(10);
    const [quizCount, setQuizCount] = useState(10);
    const [maxPages, setMaxPages] = useState<number | null>(null);
    const [nickname, setNickname] = useState('');

    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [loadingText, setLoadingText] = useState('Przetwarzanie...');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) {
            setFile(null);
            setMaxPages(null);
            return;
        }
        setFile(selectedFile);
        setErrors(prev => ({ ...prev, file: undefined, pageRange: undefined }));

        if (selectedFile.type === 'application/pdf') {
            try {
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const totalPages = pdfDoc.getPageCount();
                setMaxPages(totalPages);
                setPageTo(totalPages);
                setPageFrom(1);
            } catch (error) {
                setMaxPages(null);
                setErrors(prev => ({ ...prev, file: 'Nie udało się przetworzyć pliku PDF.' }));
            }
        } else {
            setMaxPages(null);
        }
    };

    const validateStep1 = (): boolean => {
        const newErrors: FormErrors = {};
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

        if (!youtubeUrl.trim()) newErrors.youtubeUrl = 'Link do YouTube jest wymagany.';
        else if (!youtubeRegex.test(youtubeUrl)) newErrors.youtubeUrl = 'Proszę podać prawidłowy link do YouTube.';

        if (!file) newErrors.file = 'Musisz dodać plik z notatkami.';
        if (errors.file) newErrors.file = errors.file;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: FormErrors = {};
        if (pageFrom <= 0 || pageTo <= 0) newErrors.pageRange = 'Numery stron muszą być dodatnie.';
        else if (pageTo < pageFrom) newErrors.pageRange = 'Strona "do" nie może być mniejsza niż strona "od".';
        else if (maxPages && pageTo > maxPages) newErrors.pageRange = `Dokument ma tylko ${maxPages} stron.`;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [sessionId, setSessionId] = useState<string | null>(null);

    const handleNextStep = async () => {
        if (!validateStep1() || !file || errors.file) return;
        setIsLoading(true);
        setLoadingText('Przesyłanie materiałów...');
        setErrors({});

        try {
            const data = await uploadMaterials(youtubeUrl, file);
            setSessionId(data.sessionId);
            setCurrentStep(2);
        } catch (error: any) {
            setErrors({ file: error.message || 'Błąd serwera.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!validateStep2() || !sessionId) && !USE_MOCK_DATA) return;

        setIsLoading(true);
        setLoadingText('Generowanie quizu i tworzenie pokoju...');
        setErrors({});

        try {
            let fullQuizData;

            if (USE_MOCK_DATA) {
                console.log('USING MOCK DATA - No AI tokens used');
                // Simulate delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                fullQuizData = mockQuizData;
            } else {
                // 1. Generate Quiz via API
                const result = await generateQuiz(sessionId, pageFrom, pageTo, quizCount);
                // 2. Fetch full quiz data
                fullQuizData = await getQuizById(result.quizId);
            }

            // 3. Create Room via Socket with Promise wrapper
            console.log('Connecting to socket...');
            const socket = socketService.connect();

            await new Promise((resolve, reject) => {
                // Setup listener BEFORE emitting
                socket.once('roomCreated', (response: any) => {
                    console.log('Received roomCreated event:', response);
                    if (response?.data?.roomId) {
                        console.log('Navigating to lobby:', response.data.roomId);
                        navigate(`/lobby/${response.data.roomId}`);
                        resolve(response);
                    } else {
                        console.error('Invalid roomCreated response:', response);
                        setErrors({ pageRange: 'Błąd tworzenia pokoju (błędne dane).' });
                        resolve(null);
                    }
                });

                const emitCreateRoom = () => {
                    console.log('Emitting createRoom event...');
                    // No callback used here anymore
                    const finalUsername = nickname.trim() ? `${nickname.trim()} (Host)` : 'Gospodarz (Host)';
                    socket.emit('createRoom', {
                        username: finalUsername,
                        quizData: fullQuizData
                    });
                };

                if (socket.connected) {
                    emitCreateRoom();
                } else {
                    console.log('Socket not connected, waiting for connect event...');
                    const timeout = setTimeout(() => {
                        console.error('Socket connection timeout');
                        setErrors({ pageRange: 'Błąd połączenia z serwerem gry.' });
                        resolve(null);
                    }, 5000);

                    socket.once('connect', () => {
                        clearTimeout(timeout);
                        console.log('Socket connected, emitting now...');
                        emitCreateRoom();
                    });
                }
            });

        } catch (error: any) {
            console.error('Error in handleSubmit:', error);
            setErrors({ pageRange: error.message || 'Błąd generowania.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className="container my-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-lg-8">
                        <h1 className={styles.title}>Stwórz Pokój Gry</h1>

                        <form onSubmit={handleSubmit} noValidate>
                            {currentStep === 1 && (
                                <div className={`card ${styles.formCard} mb-4`}>
                                    <div className="card-body">
                                        <h5 className="card-title">Krok 1: Materiały</h5>
                                        <div className="mb-3">
                                            <label className="form-label">Link YouTube</label>
                                            <input type="url" className={`form-control ${errors.youtubeUrl ? 'is-invalid' : ''}`}
                                                value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} required />
                                            {errors.youtubeUrl && <div className="invalid-feedback">{errors.youtubeUrl}</div>}
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Notatki (PDF)</label>
                                            <input type="file" className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                                                onChange={handleFileChange} accept=".pdf,.docx" required />
                                            {errors.file && <div className="invalid-feedback">{errors.file}</div>}
                                        </div>
                                        <button type="button" onClick={handleNextStep} className="btn btn-primary w-100" disabled={isLoading}>
                                            {isLoading ? <span className="spinner-border spinner-border-sm" /> : 'Dalej'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className={`card ${styles.formCard}`}>
                                    <div className="card-body">
                                        <h5 className="card-title">Krok 2: Ustawienia</h5>

                                        <div className="mb-3">
                                            <label className="form-label">Twój Nick</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={nickname}
                                                onChange={e => setNickname(e.target.value)}
                                                placeholder="np. Gospodarz"
                                                maxLength={15}
                                            />
                                        </div>

                                        <div className="row mb-3">
                                            <div className="col-6">
                                                <label>Od strony</label>
                                                <input type="number" className="form-control" value={pageFrom}
                                                    onChange={e => setPageFrom(Number(e.target.value))} min="1" max={maxPages || undefined} />
                                            </div>
                                            <div className="col-6">
                                                <label>Do strony</label>
                                                <input type="number" className="form-control" value={pageTo}
                                                    onChange={e => setPageTo(Number(e.target.value))} min="1" max={maxPages || undefined} />
                                            </div>
                                            {errors.pageRange && <div className="text-danger mt-1">{errors.pageRange}</div>}
                                        </div>
                                        <div className="mb-3">
                                            <label>Liczba pytań</label>
                                            <select className="form-select" value={quizCount} onChange={e => setQuizCount(Number(e.target.value))}>
                                                <option value="5">5</option>
                                                <option value="10">10</option>
                                                <option value="15">15</option>
                                            </select>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-secondary flex-grow-1">Wstecz</button>
                                            <button type="submit" className="btn btn-success flex-grow-1" disabled={isLoading}>
                                                {isLoading ? <>{loadingText} <span className="spinner-border spinner-border-sm" /> </> : 'Stwórz Pokój'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateRoomPage;

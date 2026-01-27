import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadMaterials, generateQuiz } from '../../services/quizApi';
import styles from './StudyRoomForm.module.scss';
import { FaPlusCircle, FaSignInAlt, FaArrowLeft } from 'react-icons/fa';

const StudyRoomForm: React.FC = () => {
  const navigate = useNavigate();
  
  // Tryby: 'selection' (wybór), 'create' (tworzenie), 'join' (dołączanie)
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');
  
  // Stan dla tworzenia
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Stan dla dołączania
  const [roomCode, setRoomCode] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !youtubeUrl) return alert('Wypełnij wszystkie pola!');

    setIsGenerating(true);
    try {
      // Wywołanie zgodnie z definicją w quizApi.ts
      const { sessionId } = await uploadMaterials(youtubeUrl, file);
      const { quizId } = await generateQuiz(sessionId, 1, 10, 5);
      
      // Przekierowanie do pokoju z nowym quizem
      navigate(`/study-room/${quizId}`);
    } catch (err) {
      alert('Błąd podczas tworzenia pokoju.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode) return alert('Wprowadź kod pokoju!');
    
    // Nawigacja do pokoju (obsługa kodu powinna być w komponencie StudyRoom)
    navigate(`/study-room/join?code=${roomCode.toUpperCase()}`);
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formCard}>
        {mode !== 'selection' && (
          <button className={styles.backButton} onClick={() => setMode('selection')}>
            <FaArrowLeft /> Wróć do wyboru
          </button>
        )}

        {mode === 'selection' && (
          <div className={styles.selectionWrapper}>
            <h1>🚀 Rywalizacja AI</h1>
            <p className="text-center text-muted mb-4">Wybierz, jak chcesz dzisiaj trenować</p>
            <div className={styles.selectionGrid}>
              <div className={styles.selectionItem} onClick={() => setMode('create')}>
                <FaPlusCircle size={40} className="mb-3 text-primary" />
                <h3>Stwórz nowy pokój</h3>
                <p>Prześlij PDF i film, by wygenerować quiz dla grupy.</p>
              </div>
              <div className={styles.selectionItem} onClick={() => setMode('join')}>
                <FaSignInAlt size={40} className="mb-3 text-success" />
                <h3>Dołącz do pokoju</h3>
                <p>Masz kod od znajomego? Wpisz go i zacznijcie grę.</p>
              </div>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreateSubmit}>
            <h1>🛠️ Nowa Sesja Grupowa</h1>
            <div className="mb-4">
              <label className={styles.formLabel}>Link do filmu na YouTube</label>
              <input 
                type="text" 
                className={styles.formControl} 
                value={youtubeUrl} 
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="mb-4">
              <label className={styles.formLabel}>Twoje notatki (PDF)</label>
              <input 
                type="file" 
                className={styles.formControl} 
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" className={styles.submitButton} disabled={isGenerating}>
              {isGenerating ? 'Przygotowywanie materiałów...' : 'Generuj i Zaproś Znajomych'}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoinSubmit}>
            <h1>🔑 Dołącz do Rywalizacji</h1>
            <div className="mb-4">
              <label className={styles.formLabel}>Kod Pokoju</label>
              <input 
                type="text" 
                className={styles.formControl} 
                value={roomCode} 
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="NP. AB123"
                maxLength={5}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px' }}
              />
            </div>
            <button type="submit" className={styles.submitButton}>
              Wejdź do Gry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudyRoomForm;
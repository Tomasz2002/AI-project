import React, { useState } from 'react';
import styles from './FormPage.module.scss';
import 'bootstrap/dist/css/bootstrap.min.css';

interface FormErrors {
  youtubeUrl?: string;
  file?: string;
  pageRange?: string;
  questionsToUnlock?: string;
}

const FormPage: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(10);
  const [quizCount, setQuizCount] = useState(10);
  const [questionsToUnlock, setQuestionsToUnlock] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

    if (!youtubeUrl.trim()) {
      newErrors.youtubeUrl = 'Link do YouTube jest wymagany.';
    } else if (!youtubeRegex.test(youtubeUrl)) {
      newErrors.youtubeUrl = 'Proszę podać prawidłowy link do YouTube.';
    }

    if (!file) newErrors.file = 'Musisz dodać plik z notatkami.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (pageFrom <= 0 || pageTo <= 0) {
      newErrors.pageRange = 'Numery stron muszą być dodatnie.';
    } else if (pageTo < pageFrom) {
      newErrors.pageRange = 'Strona "do" nie może być mniejsza niż strona "od".';
    }

    if (questionsToUnlock < 1) {
      newErrors.questionsToUnlock = 'Liczba pytań musi wynosić co najmniej 1.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      setErrors({});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    setErrors({});

    console.log({
      youtubeUrl,
      fileName: file?.name,
      pageFrom,
      pageTo,
      quizCount,
      questionsToUnlock
    });

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        alert('Quiz został pomyślnie utworzony! (symulacja)');
      }, 1000);
    }, 2000);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <h1 className={styles.title}>Stwórz Swój Inteligentny Quiz</h1>
            <p className="text-muted mb-4 text-center">
              Wypełnij poniższe pola, aby wygenerować spersonalizowany quiz na podstawie Twoich materiałów.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {currentStep === 1 && (
                <div className={styles.stepContainer}>
                  <div className={`card ${styles.formCard}`}>
                    <div className="card-body">
                      <h5 className="card-title"><i className="bi bi-journal-text me-2"></i>Materiały do Nauki</h5>
                      <hr />
                      <div className="mb-3">
                        <label htmlFor="youtubeUrl" className={`form-label ${styles.formLabel}`}>
                          Link do filmu z YouTube
                        </label>
                        <input
                          type="url"
                          className={`form-control ${errors.youtubeUrl ? 'is-invalid' : ''}`}
                          id="youtubeUrl"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          required
                        />
                        {errors.youtubeUrl && <div className="invalid-feedback">{errors.youtubeUrl}</div>}
                      </div>

                      <div>
                        <label htmlFor="fileUpload" className={`form-label ${styles.formLabel}`}>
                          Notatki (PDF lub DOCX)
                        </label>
                        <input
                          type="file"
                          className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                          id="fileUpload"
                          onChange={handleFileChange}
                          accept=".pdf,.docx"
                          required
                        />
                        {errors.file && <div className="invalid-feedback">{errors.file}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="d-grid mt-4">
                    <button type="button" onClick={handleNextStep} className={styles.submitButton}>
                      Dalej <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className={styles.stepContainer}>
                  <div className={`card ${styles.formCard}`}>
                    <div className="card-body">
                      <h5 className="card-title"><i className="bi bi-gear-fill me-2"></i>Ustawienia Quizu</h5>
                      <hr />
                      <div className="row mb-3">
                        <label className={`form-label ${styles.formLabel}`}>
                          Zakres stron z dokumentu do analizy
                        </label>
                        <div className="col-md-6">
                          <label htmlFor="pageFrom" className="form-label small text-muted">Od strony</label>
                          <input
                            type="number"
                            id="pageFrom"
                            className={`form-control ${errors.pageRange ? 'is-invalid' : ''}`}
                            value={pageFrom}
                            onChange={(e) => setPageFrom(Number(e.target.value))}
                            min="1"
                          />
                        </div>
                        <div className="col-md-6 mt-3 mt-md-0">
                          <label htmlFor="pageTo" className="form-label small text-muted">Do strony</label>
                          <input
                            type="number"
                            id="pageTo"
                            className={`form-control ${errors.pageRange ? 'is-invalid' : ''}`}
                            value={pageTo}
                            onChange={(e) => setPageTo(Number(e.target.value))}
                            min="1"
                          />
                        </div>
                        {errors.pageRange && <div className="invalid-feedback d-block mt-2">{errors.pageRange}</div>}
                      </div>

                      <div className="mb-3">
                        <label htmlFor="quizCount" className={`form-label ${styles.formLabel}`}>
                          Liczba pytań w quizie
                        </label>
                        <select
                          id="quizCount"
                          className="form-select"
                          value={quizCount}
                          onChange={(e) => setQuizCount(Number(e.target.value))}
                        >
                          <option value="5">5 pytań</option>
                          <option value="10">10 pytań</option>
                          <option value="15">15 pytań</option>
                          <option value="20">20 pytań (max)</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="questionsToUnlock" className={`form-label ${styles.formLabel}`}>
                          Wymagana liczba poprawnych odpowiedzi do odblokowania wideo
                        </label>
                        <input
                          type="number"
                          id="questionsToUnlock"
                          className={`form-control ${errors.questionsToUnlock ? 'is-invalid' : ''}`}
                          value={questionsToUnlock}
                          onChange={(e) => setQuestionsToUnlock(Number(e.target.value))}
                          min="1"
                        />
                        {errors.questionsToUnlock && <div className="invalid-feedback">{errors.questionsToUnlock}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className={`${styles.backButton} flex-grow-1`}
                    >
                      <i className="bi bi-arrow-left me-2"></i> Wstecz
                    </button>
                    <button
                      type="submit"
                      className={`${styles.submitButton} ${isSuccess ? styles.successButton : ''} flex-grow-1`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Generowanie...
                        </>
                      ) : isSuccess ? (
                        <>
                          <i className="bi bi-check-circle-fill me-2"> Sukces! </i>
                        </>
                      ) : (
                        'Generuj Quiz'
                      )}
                    </button>
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

export default FormPage;
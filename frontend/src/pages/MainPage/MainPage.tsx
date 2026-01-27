import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './MainPage.module.scss';
import { Link, useNavigate } from 'react-router-dom';
import { FaYoutube, FaFilePdf, FaBrain, FaUsers } from 'react-icons/fa';

const MainPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Import z YouTube i Dokumentów',
      description: 'Wklej link do filmu z YouTube oraz dodaj własne notatki w formacie PDF. Nasz system przeanalizuje treść.',
      icon: <FaYoutube size={40} className="mb-3 text-danger" />
    },
    {
      title: 'Quizy Generowane przez AI',
      description: 'Sztuczna inteligencja tworzy pytania na podstawie Twoich materiałów, pomagając Ci utrwalić wiedzę.',
      icon: <FaBrain size={40} className="mb-3 text-primary" />
    },
    {
      title: 'Interaktywna Nauka',
      description: 'Oglądaj wideo i odpowiadaj na pytania w kluczowych momentach. Ucz się efektywniej.',
      icon: <FaFilePdf size={40} className="mb-3 text-warning" />
    }
  ];

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className="container text-center">
            <h1 className={styles.heroTitle}>Zmień filmy i notatki w interaktywne quizy</h1>
            <p className={styles.heroSubtitle}>
              Wklej link do YouTube, dodaj dokumenty i pozwól AI stworzyć spersonalizowany test.
            </p>
            
            {/* Kontener z przyciskami w banerze */}
            <div className="d-flex flex-column align-items-center gap-3 mt-4">
              <Link to="/create-quiz" className={styles.ctaButton}>
                Stwórz swój pierwszy quiz
              </Link>
              <Link to="/create-study-room" className={styles.multiplayerCtaButton}>
                <FaUsers className="me-2" /> Rywalizuj ze znajomymi
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={styles.featuresSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Jak to działa?</h2>
            <div className="row g-4">
              {features.map((feature, index) => (
                <div key={index} className="col-12 col-md-6 col-lg-4">
                  <div className={`card text-center ${styles.featureCard}`}>
                    <div className="card-body">
                      {feature.icon}
                      <h5 className={styles.cardTitle}>{feature.title}</h5>
                      <p className={styles.cardText}>{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.finalCta}>
          <div className="container">
            <div className={styles.ctaSection}>
              <h3 className={styles.ctaText}>Gotowy, by zrewolucjonizować swoją naukę?</h3>
              <p className="text-secondary mb-4">Dołącz do nas i zacznij tworzyć inteligentne quizy już dziś.</p>
              <button className={styles.outlinedButton} onClick={() => navigate('/register')}>
                Zarejestruj się za darmo
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MainPage;
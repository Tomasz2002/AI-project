import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './MainPage.module.scss';
import { Link } from 'react-router-dom';
import { FaYoutube, FaFilePdf, FaBrain } from 'react-icons/fa';

const MainPage: React.FC = () => {
  const features = [
    {
      title: 'Import z YouTube i Dokumentów',
      description: 'Wklej link do filmu z YouTube oraz dodaj własne notatki w formacie PDF lub DOCX. Nasz system pobierze i przeanalizuje treść.',
      icon: <FaYoutube size={40} className="mb-3 text-danger" />
    },
    {
      title: 'Quizy Generowane przez AI',
      description: 'Sztuczna inteligencja tworzy angażujące pytania na podstawie dostarczonych materiałów, pomagając Ci sprawdzić i utrwalić wiedzę.',
      icon: <FaBrain size={40} className="mb-3 text-primary" />
    },
    {
      title: 'Interaktywna Nauka',
      description: 'Oglądaj wideo i odpowiadaj na pytania w kluczowych momentach. Kontynuuj oglądanie dopiero po udzieleniu poprawnej odpowiedzi.',
      icon: <FaFilePdf size={40} className="mb-3 text-warning" />
    }
  ];

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className="container">
            <h1 className={styles.heroTitle}>Zmień filmy i notatki w interaktywne quizy</h1>
            <p className={styles.heroSubtitle}>
              Wklej link do YouTube, dodaj swoje dokumenty i pozwól sztucznej inteligencji stworzyć spersonalizowany test.
            </p>
          <Link to="/create-quiz" className={styles.ctaButton}>
              Stwórz swój pierwszy quiz
          </Link>
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
                      <p className={styles.cardText}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <div className="container">
            <div className={styles.ctaSection}>
              <h3 className={styles.ctaText}>Gotowy, by zrewolucjonizować swoją naukę?</h3>
              <p className="text-secondary mb-4">Dołącz do nas i zacznij tworzyć inteligentne quizy już dziś.</p>
              <button className={styles.outlinedButton}>
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
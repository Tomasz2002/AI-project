import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './MainPage.module.scss';

const MainPage: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className="container">
          <h1 className={styles.heroTitle}>Witaj na naszej stronie</h1>
          <p className={styles.heroSubtitle}>Poznaj nasze usługi i produkty</p>
          <button className={styles.ctaButton}>
            Dowiedz się więcej
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Nasze funkcjonalności</h2>
          <div className="row g-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="col-12 col-md-6 col-lg-4">
                <div className={`card ${styles.featureCard}`}>
                  <div className="card-body">
                    <h5 className={styles.cardTitle}>Funkcja {item}</h5>
                    <p className={styles.cardText}>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                      Sed do eiusmod tempor incididunt ut labore.
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
            <h3 className={styles.ctaText}>Chcesz się dowiedzieć więcej?</h3>
            <button className={styles.outlinedButton}>
              Skontaktuj się z nami
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MainPage;
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className="row">
          {/* O Aplikacji */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>QuizTube</h6>
            <p className={styles.columnText}>
              Inteligentna platforma do nauki, która przekształca materiały wideo i tekstowe w interaktywne quizy.
            </p>
          </div>

          {/* Linki */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>Nawigacja</h6>
            <ul className={styles.linksList}>
              <li><a href="#features" className={styles.link}>Funkcje</a></li>
              <li><a href="#" className={styles.link}>Cennik</a></li>
              <li><a href="#" className={styles.link}>FAQ</a></li>
            </ul>
          </div>

          {/* Prawne */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>Informacje</h6>
            <ul className={styles.linksList}>
              <li><a href="#" className={styles.link}>Regulamin</a></li>
              <li><a href="#" className={styles.link}>Polityka Prywatności</a></li>
              <li><a href="#" className={styles.link}>Kontakt</a></li>
            </ul>
          </div>

          {/* Social */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>Śledź nas</h6>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink}>Facebook</a>
              <a href="#" className={styles.socialLink}>Twitter</a>
              <a href="#" className={styles.socialLink}>LinkedIn</a>
            </div>
          </div>
        </div>

        <div className={styles.divider}></div>
        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            &copy; 2025 QuizTube. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
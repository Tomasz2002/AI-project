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
        </div>
        <div className={styles.divider}></div>
        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            &copy; 2025 QuizTube.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
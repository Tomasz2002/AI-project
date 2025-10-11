import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer} style={{ width: '100%' }}>
      <div style={{ width: '100%', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="row">
          {/* O nas */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>O nas</h6>
            <p className={styles.columnText}>
              Nowoczesna strona internetowa zbudowana w React i Bootstrap.
            </p>
          </div>

          {/* Linki */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>Linki</h6>
            <ul className={styles.linksList}>
              <li>
                <a href="#" className={styles.link}>
                  Strona główna
                </a>
              </li>
              <li>
                <a href="#" className={styles.link}>
                  O nas
                </a>
              </li>
              <li>
                <a href="#" className={styles.link}>
                  Usługi
                </a>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>Kontakt</h6>
            <p className={styles.columnText}>Email: info@example.com</p>
            <p className={styles.columnText}>Tel: +48 123 456 789</p>
          </div>

          {/* Social */}
          <div className={`col-12 col-md-6 col-lg-3 ${styles.column}`}>
            <h6 className={styles.columnTitle}>Śledź nas</h6>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink}>
                Facebook
              </a>
              <a href="#" className={styles.socialLink}>
                Twitter
              </a>
              <a href="#" className={styles.socialLink}>
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            &copy; 2025 Moja Strona. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
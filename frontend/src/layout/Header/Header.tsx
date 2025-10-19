import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './Header.module.scss';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <nav className={`navbar navbar-expand-lg ${styles.navbar}`} style={{ width: '100%' }}>
      <div className="container">

          <Link to="/" className={`navbar-brand ${styles.navbarBrand}`}>
              QuizTube
          </Link>
        <button
          className={`navbar-toggler ${styles.navbarToggler}`}
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#features">
                Funkcje
              </a>
            </li>
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#">
                Cennik
              </a>
            </li>
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#">
                Kontakt
              </a>
            </li>
            <li className={`nav-item ${styles.navItem}`}>
               <a className={`nav-link ${styles.navLink}`} href="#">
                 Zaloguj się
               </a>
            </li>
            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
               <button className={styles.ctaButton}>
                 Wypróbuj za darmo
               </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
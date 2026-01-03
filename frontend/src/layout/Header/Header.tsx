import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './Header.module.scss';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

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
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#features">Funkcje</a>
            </li>
            {token ? (
              <>
                <li className={`nav-item ${styles.navItem}`}>
                  <span className={`nav-link ${styles.navLink}`}>Witaj, {user.name}</span>
                </li>
                <li className="nav-item ms-lg-2">
                   <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
                     Wyloguj się
                   </button>
                </li>
              </>
            ) : (
              <>
                <li className={`nav-item ${styles.navItem}`}>
                   <Link className={`nav-link ${styles.navLink}`} to="/login">
                     Zaloguj się
                   </Link>
                </li>
                <li className="nav-item ms-lg-2">
                   <Link to="/register" className={styles.ctaButton} style={{ textDecoration: 'none' }}>
                     Wypróbuj za darmo
                   </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
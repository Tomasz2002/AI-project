import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './Header.module.scss';

const Header: React.FC = () => {
  return (
    <nav className={`navbar navbar-expand-lg ${styles.navbar}`} style={{ width: '100%' }}>
      <div style={{ width: '100%', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <a className={`navbar-brand ${styles.navbarBrand}`} href="#">
          Logo
        </a>
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
          <ul className="navbar-nav ms-auto">
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#">
                Strona główna
              </a>
            </li>
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#">
                O nas
              </a>
            </li>
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#">
                Usługi
              </a>
            </li>
            <li className={`nav-item ${styles.navItem}`}>
              <a className={`nav-link ${styles.navLink}`} href="#">
                Kontakt
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
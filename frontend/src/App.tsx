import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.scss';

// Komponenty layout
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

// Strony
import MainPage from './pages/MainPage/MainPage';
import NotFound from './pages/NotFound/NotFound';

// Definicja stron z opcjami widoczności
const PAGES_CONFIG: Record<string, { showHeader: boolean; showFooter: boolean }> = {
  '/': { showHeader: true, showFooter: true },
  '/about': { showHeader: true, showFooter: true },
  '/contact': { showHeader: true, showFooter: true },
  // Dodaj tu nowe strony
};

// Hook do sprawdzenia czy komponent powinien być widoczny
function usePageConfig(path: string) {
  // Domyślnie pokaż header i footer
  return PAGES_CONFIG[path] || { showHeader: true, showFooter: true };
}

// Wrapper dla stron z Header i Footer
interface PageWrapperProps {
  children: React.ReactNode;
  showHeader: boolean;
  showFooter: boolean;
}

function PageWrapper({ children, showHeader, showFooter }: PageWrapperProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showHeader && <Header />}
      <main style={{ flex: 1, width: '100%' }}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Strona główna - z Header i Footer */}
        <Route
          path="/"
          element={
            <PageWrapper showHeader={true} showFooter={true}>
              <MainPage />
            </PageWrapper>
          }
        />

        {/* Inne strony - dodaj tutaj nowe */}
        <Route
          path="/about"
          element={
            <PageWrapper showHeader={true} showFooter={true}>
              <div className="container py-5">
                <h1>O nas</h1>
                <p>Tutaj będzie treść strony O nas</p>
              </div>
            </PageWrapper>
          }
        />

        <Route
          path="/contact"
          element={
            <PageWrapper showHeader={true} showFooter={true}>
              <div className="container py-5">
                <h1>Kontakt</h1>
                <p>Tutaj będzie formularz kontaktowy</p>
              </div>
            </PageWrapper>
          }
        />

        {/* Strona 404 - bez Header i Footer */}
        <Route
          path="*"
          element={
            <PageWrapper showHeader={false} showFooter={false}>
              <NotFound />
            </PageWrapper>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
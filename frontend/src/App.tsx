import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.scss';
import Layout from "./layout/Layout";
import Header from './layout/Header/Header';
import Footer from './layout/Footer/Footer';
import MainPage from './pages/MainPage/MainPage';
import FormPage from './pages/FormPage/FormPage';
import QuizPlayerPage from './pages/QuizPlayerPage/QuizPlayerPage';
import NotFound from './pages/NotFound/NotFound';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import SessionsPage from './pages/SessionPage/SessionPage';
import AccessRoomPage from './pages/AccessRoomPage/AccessRoomPage';
import CreateRoomPage from './pages/CreateRoomPage/CreateRoomPage';
import LobbyPage from './pages/LobbyPage/LobbyPage';
import MultiplayerGamePage from './pages/MultiplayerGamePage/MultiplayerGamePage';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  const content = (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Chronione trasy */}
      <Route path="/create-quiz" element={isAuthenticated ? <FormPage /> : <Navigate to="/login" />} />
      <Route path="/quiz/:quizId" element={isAuthenticated ? <QuizPlayerPage /> : <Navigate to="/login" />} />
      <Route path="/sessions" element={isAuthenticated ? <SessionsPage /> : <Navigate to="/login" />} />
      <Route path="/multiplayer" element={isAuthenticated ? <AccessRoomPage /> : <Navigate to="/login" />} />
      <Route path="/create-room" element={isAuthenticated ? <CreateRoomPage /> : <Navigate to="/login" />} />
      <Route path="/lobby/:roomId" element={isAuthenticated ? <LobbyPage /> : <Navigate to="/login" />} />
      <Route path="/game/:roomId" element={isAuthenticated ? <MultiplayerGamePage /> : <Navigate to="/login" />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  const header = (
    <Routes>
      <Route path="*" element={<Header />} />
    </Routes>
  );

  const footer = (
    <Routes>
      <Route path="*" element={<Footer />} />
    </Routes>
  );

  return (
    <Router>
      <Layout
        header={header}
        content={content}
        footer={footer}
      />
    </Router>
  );
}

export default App;
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

function App() {
  const content = (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/create-quiz" element={<FormPage />} />
      <Route path="/quiz/:quizId" element={<QuizPlayerPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )

  const header = (
    <Routes>
      <Route path="*" element={<Header />} />
    </Routes>
  )
 
  const footer = (
    <Routes>
       <Route path="*" element={<Footer />} />
    </Routes>
  )

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
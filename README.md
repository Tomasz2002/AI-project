# 🎓 System Inteligentnego Generowania Interaktywnych Quizów Edukacyjnych

**Projekt Inżynierski** – Innowacyjna platforma edukacyjna wykorzystująca sztuczną inteligencję do automatyzacji procesu nauki poprzez analizę dokumentów PDF i integrację z materiałami wideo.

---

## 📝 O projekcie

System rozwiązuje problem czasochłonnego przygotowywania pytań kontrolnych z obszernych materiałów dydaktycznych. Dzięki wykorzystaniu modeli **LLM (Large Language Models)**, aplikacja potrafi samodzielnie analizować notatki, wyciągać z nich kluczowe informacje i tworzyć interaktywne sprawdziany wiedzy zsynchronizowane z czasem trwania filmów w serwisie YouTube.

## 🚀 Kluczowe funkcjonalności

* **📄 Przetwarzanie dokumentów PDF**: Wyodrębnianie tekstu z wybranych stron przy użyciu bibliotek `pdf-lib` oraz `pdf-parse`.
* **🤖 Generowanie pytań przez AI**: Integracja z modelem **Gemini 2.0 Flash**, który na podstawie kontekstu tekstu tworzy pytania zamknięte w formacie JSON.
* **🎥 Interaktywny Odtwarzacz**: Synchronizacja pytań z osią czasu wideo YouTube. Quizy pojawiają się w określonych odstępach czasu, blokując postęp filmu do momentu udzielenia odpowiedzi.
* **📊 Zarządzanie postępami**: System śledzi ukończone pytania i zapisuje je w bazie danych MongoDB, umożliwiając kontynuację nauki w dowolnym momencie.
* **🔐 Bezpieczna Autoryzacja**: System logowania i rejestracji oparty na **JWT (JSON Web Token)** i Passport.js.

---

## 🛠️ Stos technologiczny

### Backend (NestJS)
| Technologia | Opis |
| :--- | :--- |
| **NestJS** | Główny framework aplikacji serwerowej. |
| **MongoDB & Mongoose** | Baza danych NoSQL do przechowywania danych użytkowników i sesji. |
| **Google Gemini API** | Model Gemini 2.0 Flash do generowania pytań na podstawie tekstu. |
| **Multer** | Middleware do obsługi przesyłania plików PDF. |

### Frontend (React)
| Technologia | Opis |
| :--- | :--- |
| **React (Vite)** | Biblioteka do budowy interfejsu użytkownika. |
| **Sass & Bootstrap** | Stylowanie i responsywność interfejsu. |
| **React Router** | Zarządzanie nawigacją i chronionymi trasami. |
| **i18next** | Framework do obsługi wielu języków. |

---

## 📂 Struktura projektu

```text
├── backend                 # Logika serwerowa
│   ├── src/auth            # Rejestracja, logowanie i JWT
│   ├── src/models          # Schematy Mongoose (User, Quiz)
│   ├── src/quiz            # Serwis AI, obsługa PDF i YouTube
│   └── uploads/documents   # Magazyn przesłanych plików
└── frontend                # Interfejs użytkownika
    ├── src/pages           # Widoki (Main, Form, Quiz Player, Sessions)
    ├── src/layout          # Komponenty nawigacyjne (Header, Footer)
    └── src/services        # Funkcje API do komunikacji z serwerem
```

---

## ⚙️ Instalacja i konfiguracja

### 1. Wymagania wstępne
* Node.js (v18+)
* MongoDB
* Klucz API Google Gemini (Google AI Studio)
* Klucz API YouTube Data v3 (Google Cloud Console)

### 2. Konfiguracja środowiska
W katalogu `/backend` utwórz plik `.env` i uzupełnij go:
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=ai-project
JWT_SECRET=twoj_unikalny_klucz_jwt
GEMINI_API_KEY=twoj_klucz_gemini
YOUTUBE_API_KEY=twoj_klucz_youtube
```

### 3. Uruchomienie aplikacji

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---
*Projekt zrealizowany jako praca inżynierska.*
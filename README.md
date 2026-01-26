# System Inteligentnego Generowania Interaktywnych Quizów Edukacyjnych

### Projekt Inżynierski
Aplikacja webowa wspierająca proces uczenia się poprzez automatyczne generowanie pytań sprawdzających wiedzę na podstawie przesłanych materiałów PDF oraz synchronizację ich z materiałami wideo z serwisu YouTube.

##  O projekcie
Głównym celem projektu jest ułatwienie przyswajania wiedzy z notatek lub dokumentów. System wykorzystuje modele językowe (LLM) do analizy treści tekstowej i tworzenia spersonalizowanych testów, które są osadzane na osi czasu wybranego filmu.

##  Kluczowe funkcjonalności
* **Ekstrakcja treści**: Wyodrębnianie tekstu z wybranych stron dokumentów PDF przy użyciu bibliotek `pdf-lib` oraz `pdf-parse`.
* **Generowanie pytań przez AI**: Wykorzystanie modelu **Gemini 2.0 Flash** do tworzenia pytań jednokrotnego wyboru na podstawie kontekstu przesłanych notatek.
* **Interaktywny Odtwarzacz**: Synchronizacja pytań z czasem trwania wideo na YouTube, co pozwala na sprawdzanie wiedzy w trakcie oglądania.
* **Zarządzanie Sesjami**: Możliwość przeglądania historii wygenerowanych quizów oraz śledzenia postępów.
* **System Autoryzacji**: Bezpieczny dostęp dzięki implementacji JWT oraz Passport.js.

##  Stos technologiczny

### Backend (NestJS)
* **Framework**: NestJS.
* **Baza danych**: MongoDB (Mongoose).
* **AI**: Google Generative AI SDK.
* **Bezpieczeństwo**: Passport JWT, Bcrypt.
* **Obsługa plików**: Multer (przesyłanie PDF).

### Frontend (React)
* **Biblioteka**: React (Vite).
* **Stylizacja**: Sass, Bootstrap, Bootstrap Icons.
* **Routing**: React Router DOM.
* **Umiędzynarodowienie**: i18next.

##  Struktura projektu
* `/backend` – Logika serwerowa, integracja z AI i bazą danych.
* `/frontend` – Interfejs użytkownika i komunikacja z API.
* `/uploads` – Magazyn dla przesłanych dokumentów PDF.

## ⚙️ Instalacja i konfiguracja

### Wymagania wstępne
* Node.js (v18+)
* MongoDB
* Klucze API: Google Gemini API oraz YouTube Data API v3

### Konfiguracja środowiska
W folderze `/backend` utwórz plik `.env`:
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=ai-project
JWT_SECRET=twoj_sekretny_klucz
GEMINI_API_KEY=twoj_klucz_gemini
YOUTUBE_API_KEY=twoj_klucz_youtube```
Uruchomienie
    Backend:
    Bash
```
    cd backend
    npm install
    npm run dev
```
    Frontend:
    Bash
```
    cd frontend
    npm install
    npm run dev
```
Projekt zrealizowany jako praca inżynierska.
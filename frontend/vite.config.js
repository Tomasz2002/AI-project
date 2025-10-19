// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Każde żądanie do ścieżki /api...
      '/api': {
        // ...przekaż do serwera backendu
        target: 'http://localhost:3001', // <-- UPEWNIJ SIĘ, ŻE TO POPRAWNY PORT BACKENDU
        changeOrigin: true,
      },
    },
  },
});
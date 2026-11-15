import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas: la app funciona en la raíz (localhost) o en una subcarpeta (GitHub Pages)
  base: './',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.js'] },
});

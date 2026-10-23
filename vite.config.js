import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Préfixe des fichiers de public/ dans le code (voir src/lib/media.js) :
  // « / » en production, « ./ » pour l'aperçu hébergé (npm run apercu).
  define: {
    __BASE_MEDIA__: JSON.stringify(process.env.BASE_MEDIA || '/'),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
});

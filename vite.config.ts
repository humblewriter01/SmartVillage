import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ['defaults', 'not IE 11', 'chrome >= 52', 'android >= 5'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  build: {
    target: 'es2015',
    cssTarget: 'chrome61',
  },
  resolve: {
    alias: {
      '@capacitor/voice-recorder': 'capacitor-voice-recorder',
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

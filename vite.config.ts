import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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

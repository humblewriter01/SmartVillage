import React from 'react';
import ReactDOM from 'react-dom/client';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initLegacyPolyfills } from './utils/safeStorage';
import './index.css';

// Initialize legacy browser polyfills for older Android WebViews (Chrome 52-69)
initLegacyPolyfills();

// Initialize Capacitor PWA Elements for camera/action-sheet on web
try {
  defineCustomElements(window);
} catch (e) {
  console.warn('Capacitor PWA Elements initialization skipped:', e);
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(console.error);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

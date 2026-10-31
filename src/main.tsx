import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './customAdditions.css';

// Registrar Service Worker para PWA en celulares y navegadores
if ('serviceWorker' in navigator && !(window as any).electronAPI?.isElectron) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[La Molienda PWA] Service Worker activo:', reg.scope);
      })
      .catch((err) => {
        console.warn('[La Molienda PWA] Error registrando SW:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

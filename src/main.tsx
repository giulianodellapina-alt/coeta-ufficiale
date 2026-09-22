import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (reasonStr.includes('FIRESTORE') || reasonStr.includes('INTERNAL ASSERTION') || reasonStr.includes('Unexpected state')) {
      console.warn('Intercettata e soppressa eccezione interna non fatale di Firestore:', event.reason);
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const errStr = String(event.error?.message || event.message || '');
    if (errStr.includes('FIRESTORE') || errStr.includes('INTERNAL ASSERTION') || errStr.includes('Unexpected state')) {
      console.warn('Intercettato errore globale Firestore non fatale:', event.error);
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

if ('serviceWorker' in navigator) {
  if ((import.meta as any).env?.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('PWA ServiceWorker registrato con successo:', registration.scope);
      }).catch((error) => {
        console.warn('Registrazione PWA ServiceWorker fallita:', error);
      });
    });
  } else {
    // In ambiente di sviluppo/anteprima deregistriamo eventuali vecchi SW per prevenire cache stale
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

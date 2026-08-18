import '@fontsource-variable/archivo';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ActualizacionPWA from './components/ActualizacionPWA';
import { ToastProvider } from './components/molecules/Toast';
import { AuthProvider } from './lib/AuthProvider';
import './i18n';
import './styles/design-system.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('No se encontró el elemento #root');
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const tree = (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <App />
        <ActualizacionPWA />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

createRoot(root).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
    ) : (
      tree
    )}
  </StrictMode>,
);

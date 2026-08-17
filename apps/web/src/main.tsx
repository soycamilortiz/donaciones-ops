import '@fontsource-variable/archivo';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ActualizacionPWA from './components/ActualizacionPWA';
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
      <App />
      <ActualizacionPWA />
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
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Marketing from './Marketing.jsx';
import { Capacitor } from '@capacitor/core';
import './styles.css';
import './mobile-feed.css';
import './beta.css';
import './safe-area.css';
const demoOnly = /^\/demo\/?$/.test(location.pathname);
const authReturn =
  new URLSearchParams(location.search).has('google') ||
  new URLSearchParams(location.search).has('oauth_error') ||
  new URLSearchParams(location.search).has('open');
const useApp =
  Capacitor.isNativePlatform() ||
  demoOnly ||
  authReturn ||
  /^\/(app|recuperar-contrasena|restablecer-contrasena)\/?$/.test(location.pathname);
createRoot(document.getElementById('root')).render(
  useApp ? <App demoOnly={demoOnly} /> : <Marketing />,
);

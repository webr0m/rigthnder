import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Marketing from './Marketing.jsx';
import ModerationPage from './ModerationPage.jsx';
import { Capacitor } from '@capacitor/core';
import { isPageRoute } from '../server/routes.mjs';
import { t } from './locale.mjs';
import { isPasswordRecoveryPath } from './app-routes.mjs';
import './styles.css';
import './mobile-feed.css';
import './beta.css';
import './safe-area.css';
const demoOnly = /^\/demo\/?$/.test(location.pathname);
const moderationOnly = /^\/moderation\/?$/.test(location.pathname);
const authReturn =
  new URLSearchParams(location.search).has('google') ||
  new URLSearchParams(location.search).has('oauth_error') ||
  new URLSearchParams(location.search).has('open');
const useApp =
  Capacitor.isNativePlatform() ||
  demoOnly ||
  authReturn ||
  isPasswordRecoveryPath(location.pathname) || /^\/(app|verificar-correo)\/?$/.test(location.pathname);
createRoot(document.getElementById('root')).render(
  !Capacitor.isNativePlatform() && !isPageRoute(location.pathname) ? (
    <main className="boot">
      <h1>404</h1>
      <p>{t('Esta página no existe.')}</p>
      <a className="button" href="/">
        {t('Volver a la portada')}
      </a>
    </main>
  ) : moderationOnly ? (
    <ModerationPage />
  ) : useApp ? (
    <App demoOnly={demoOnly} />
  ) : (
    <Marketing />
  ),
);

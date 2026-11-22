import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
const App = lazy(() => import('./App.jsx'));
const Marketing = lazy(() => import('./Marketing.jsx'));
const ModerationPage = lazy(() => import('./ModerationPage.jsx'));
import AppUpdates from './AppUpdates.jsx';
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
  isPasswordRecoveryPath(location.pathname) ||
  /^\/(app|verificar-correo)\/?$/.test(location.pathname);
class AppLoaderBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="boot" role="alert">
          <h1>OnlyFachos</h1>
          <p>{t('No pudimos cargar la app. Tu sesión y tus datos siguen guardados.')}</p>
          <button className="button" onClick={() => location.reload()}>
            {t('Reintentar')}
          </button>
        </main>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(
  <AppLoaderBoundary>
    <Suspense
      fallback={
        <main className="boot" role="status">
          {t('Preparando buenas conversaciones…')}
        </main>
      }
    >
      <AppUpdates />
      {!Capacitor.isNativePlatform() && !isPageRoute(location.pathname) ? (
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
      )}
    </Suspense>
  </AppLoaderBoundary>,
);

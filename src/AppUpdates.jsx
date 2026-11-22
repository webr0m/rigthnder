import React, { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import {
  checkUpdates,
  startUpdate,
  completeUpdate,
  listenUpdates,
  updatesAvailable,
  updateState,
} from './app-updates.mjs';
import { useLanguage } from './LanguagePicker';
import { t } from './locale.mjs';

export default function AppUpdates() {
  useLanguage();
  const [info, setInfo] = useState(null),
    [hidden, setHidden] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [safe, setSafe] = useState(false),
    [editing, setEditing] = useState(false);
  useEffect(() => {
    const safety = (e) => setSafe(Boolean(e.detail));
    const focus = () =>
      setEditing(
        !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'),
      );
    window.addEventListener('onlyfachos:update-safe', safety);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', focus);
    return () => {
      window.removeEventListener('onlyfachos:update-safe', safety);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', focus);
    };
  }, []);
  useEffect(() => {
    if (!updatesAvailable()) return;
    let alive = true,
      last = 0,
      checking = false;
    const handles = [];
    const bind = async (promise) => {
      const handle = await promise;
      if (alive) handles.push(handle);
      else await handle.remove();
    };
    const check = async (manual = false) => {
      if (checking || (!manual && Date.now() - last < 60000)) return;
      checking = true;
      last = Date.now();
      try {
        const value = await checkUpdates();
        if (alive) {
          setInfo({ ...value, manual });
          setError('');
          if (manual) setHidden(false);
        }
      } catch (e) {
        if (alive && manual) {
          setError(e.message);
          setHidden(false);
        }
      } finally {
        checking = false;
      }
    };
    check();
    bind(
      listenUpdates((value) => {
        if (alive) {
          setInfo((old) => ({ ...old, ...value }));
          if (value.status === 11) setHidden(false);
        }
      }),
    ).catch(() => {});
    bind(
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) check();
      }),
    ).catch(() => {});
    const manual = () => check(true);
    window.addEventListener('onlyfachos:check-update', manual);
    return () => {
      alive = false;
      handles.forEach((h) => h.remove());
      window.removeEventListener('onlyfachos:check-update', manual);
    };
  }, []);
  if (
    !updatesAvailable() ||
    editing ||
    (!safe && !info?.manual && !error) ||
    hidden ||
    (!error && (!info || (updateState(info) === 'current' && !info.manual)))
  )
    return null;
  const state = info ? updateState(info) : 'current';
  const progress =
    info?.totalBytes > 0
      ? Math.min(100, Math.round((100 * info.bytesDownloaded) / info.totalBytes))
      : null;
  return (
    <aside className="update-notice" aria-label={t('Actualización de la app')}>
      <div role="status">
        <strong>
          {t(
            error && !info
              ? 'No se pudieron buscar actualizaciones.'
              : state === 'ready'
                ? 'Actualización lista'
                : state === 'downloading'
                  ? 'Descargando actualización…'
                  : state === 'current'
                    ? 'Tu app está actualizada.'
                    : 'Hay una actualización disponible',
          )}
        </strong>
        {error && <p role="alert">{t(error)}</p>}
        {state === 'downloading' && progress !== null && (
          <progress max="100" value={progress} aria-label={t('Descargando actualización…')} />
        )}
      </div>
      {['available', 'ready'].includes(state) && (
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              if (state === 'ready') await completeUpdate();
              else {
                const result = await startUpdate();
                if (!result.accepted) setHidden(true);
              }
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t(state === 'ready' ? 'Reiniciar e instalar' : 'Actualizar')}
        </button>
      )}
      <button
        type="button"
        className="icon-button"
        aria-label={t('Más tarde')}
        onClick={() => setHidden(true)}
      >
        ×
      </button>
    </aside>
  );
}

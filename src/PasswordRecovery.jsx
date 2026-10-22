import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { api, setToken } from './api';
import { Button } from './Shared';
import { getLanguage, t } from './locale.mjs';

export default function PasswordRecovery({ token, onBack, onReset }) {
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState('');
  const invalid = token !== undefined && !/^[a-f0-9]{64}$/.test(token);
  const [requestNew, setRequestNew] = useState(false);
  const resetting = token !== undefined && !invalid && !requestNew;
  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setError('');
    if (resetting && data.password !== data.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      if (resetting) {
        await api('/auth/reset-password', {
          method: 'POST',
          body: { token, password: data.password },
        });
        setToken(null);
        onReset?.();
        history.replaceState({}, '', '/recuperar-contrasena');
        setDone(true);
      } else {
        await api('/auth/forgot-password', {
          method: 'POST',
          body: { email: data.email.trim(), language: getLanguage() },
        });
        setSent(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="recovery-panel" aria-labelledby="recovery-title">
      <div className="recovery-icon">
        {done ? <CheckCircle2 /> : resetting ? <ShieldCheck /> : <Mail />}
      </div>
      <span className="label-strip">{t('TU CUENTA, DE VUELTA')}</span>
      <h1 id="recovery-title">
        {t(
          done
            ? 'CONTRASEÑA ACTUALIZADA'
            : sent
              ? 'REVISA TU CORREO'
              : resetting
                ? 'UNA NUEVA CONTRASEÑA'
                : 'RECUPERA TU CUENTA',
        )}
      </h1>
      {done ? (
        <p role="status">
          {t(
            'Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad, cerramos las sesiones anteriores.',
          )}
        </p>
      ) : sent ? (
        <div role="status">
          <p>
            {t(
              'Si tienes una cuenta con contraseña, recibirás un enlace para recuperarla. Revisa también el correo no deseado.',
            )}
          </p>
          <p className="hint">
            {t('El enlace vence en 30 minutos. Si usas Google, entra con el botón de Google.')}
          </p>
        </div>
      ) : (
        <>
          <p>
            {t(
              resetting
                ? 'Usa al menos 10 caracteres. El enlace solo se puede utilizar una vez.'
                : 'Escribe el correo con el que te registraste. Te enviaremos un enlace para elegir una contraseña nueva.',
            )}
          </p>
          {invalid && (
            <p className="form-error" role="alert">
              {t('El enlace no es válido o ya venció. Solicita uno nuevo.')}
            </p>
          )}
          <form className="form" onSubmit={submit}>
            {resetting ? (
              <>
                <label>
                  {t('Nueva contraseña')}
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                    placeholder={t('Mínimo 10 caracteres')}
                  />
                </label>
                <label>
                  {t('Repite la nueva contraseña')}
                  <input
                    type="password"
                    name="confirm"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                  />
                </label>
              </>
            ) : (
              <label>
                {t('Correo')}
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={160}
                  required
                  placeholder={t('tu@correo.com')}
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {t(error)}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" />
              ) : (
                t(resetting ? 'GUARDAR CONTRASEÑA' : 'ENVIAR ENLACE')
              )}
            </Button>
            {resetting && error && (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setRequestNew(true);
                  setError('');
                  history.replaceState({}, '', '/recuperar-contrasena');
                }}
              >
                {t('Solicitar un enlace nuevo')}
              </button>
            )}
          </form>
        </>
      )}
      <button className="text-link recovery-back" type="button" disabled={busy} onClick={onBack}>
        <ArrowLeft size={16} />
        {t('Volver a iniciar sesión')}
      </button>
    </section>
  );
}

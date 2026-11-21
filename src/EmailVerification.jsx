import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from 'lucide-react';
import { api } from './api';
import { Button } from './Shared';
import { getLanguage, t } from './locale.mjs';

export default function EmailVerification({ email, onBack }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function resend(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/resend-verification', {
        method: 'POST',
        body: { email: e.currentTarget.email.value.trim(), language: getLanguage() },
      });
      setSent(true);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="recovery-panel" aria-labelledby="verification-title">
      <div className="recovery-icon">
        {sent ? <CheckCircle2 /> : <Mail />}
      </div>
      <span className="label-strip">{t('ACTIVA TU CUENTA')}</span>
      <h1 id="verification-title">{t(sent ? 'ENLACE ENVIADO' : 'CONFIRMA TU CORREO')}</h1>
      {sent ? (
        <div role="status">
          <p>{t('Si la cuenta necesita verificación, recibirás un enlace. Revisa también el correo no deseado.')}</p>
          <p className="hint">{t('El enlace vence en 24 horas y solo se puede usar una vez.')}</p>
        </div>
      ) : (
        <>
          <p>{t('Confirma tu correo para activar el acceso a OnlyFachos.')}</p>
          <form className="form" onSubmit={resend}>
            <label>
              {t('Correo')}
              <input
                name="email"
                type="email"
                defaultValue={email}
                autoComplete="email"
                maxLength={160}
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {t(error)}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : t('REENVIAR CONFIRMACIÓN')}
            </Button>
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

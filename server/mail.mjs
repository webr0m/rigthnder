import nodemailer from 'nodemailer';
import { existsSync } from 'node:fs';

// Credentials stay on the server. Never derive reset links from request headers.
export function createRecoveryMailer(
  env = process.env,
  createTransport = nodemailer.createTransport,
) {
  if (!env.MAIL_FROM || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.MAIL_FROM)) return null;
  let origin;
  try {
    const url = new URL(env.PUBLIC_URL);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return null;
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:') return null;
    origin = url.origin;
  } catch {
    return null;
  }
  let transport;
  if (env.MAIL_TRANSPORT === 'sendmail') {
    const path = env.SENDMAIL_PATH || '/usr/sbin/sendmail';
    if (!existsSync(path)) return null;
    transport = createTransport({ sendmail: true, path, newline: 'unix' });
  } else if (env.MAIL_TRANSPORT === 'smtp' && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transport = createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 465),
      secure: (env.SMTP_PORT || '465') === '465',
      requireTLS: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  } else return null;
  return {
    async sendReset({ email, token, language }) {
      const link = new URL('/recuperar-contrasena', origin);
      link.hash = new URLSearchParams({ token, lang: language }).toString();
      const copy =
        {
          es: [
            'Recupera tu contraseña de OnlyFachos',
            'Elige una contraseña nueva',
            'Recibimos una solicitud para recuperar tu cuenta. Abre este enlace para elegir una contraseña nueva:',
            'El enlace vence en 30 minutos y solo se puede usar una vez.',
            'Si no lo solicitaste, ignora este correo. Tu contraseña no ha cambiado.',
          ],
          en: [
            'Reset your OnlyFachos password',
            'Choose a new password',
            'We received a request to recover your account. Open this link to choose a new password:',
            'This link expires in 30 minutes and can only be used once.',
            'If you did not request this, ignore this email. Your password has not changed.',
          ],
          de: [
            'Dein OnlyFachos-Passwort zurücksetzen',
            'Wähle ein neues Passwort',
            'Wir haben eine Anfrage zur Wiederherstellung deines Kontos erhalten. Öffne diesen Link, um ein neues Passwort festzulegen:',
            'Dieser Link läuft in 30 Minuten ab und kann nur einmal verwendet werden.',
            'Falls du dies nicht angefordert hast, ignoriere diese E-Mail. Dein Passwort wurde nicht geändert.',
          ],
        }[language] || null;
      if (!copy) throw new Error('Unsupported recovery language');
      const [subject, heading, intro, expiry, ignore] = copy;
      const safeLink = link.href.replaceAll('&', '&amp;');
      return transport.sendMail({
        from: { name: 'OnlyFachos', address: env.MAIL_FROM },
        to: email,
        subject,
        text: `OnlyFachos\n\n${heading}\n\n${intro}\n${link.href}\n\n${expiry}\n\n${ignore}`,
        html: `<html lang="${language}"><body style="margin:0;background:#f2efe6;color:#151515;font:16px Arial,sans-serif"><main style="max-width:520px;margin:32px auto;padding:28px;background:white;border-radius:20px"><b style="background:#ffdb00;padding:8px">ONLYFACHOS</b><h1 style="font-size:26px;margin-top:32px">${heading}</h1><p>${intro}</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:16px;background:#ffdb00;color:#111;border-radius:10px;text-decoration:none;font-weight:bold">${heading}</a></p><p>${expiry}</p><p style="color:#555">${ignore}</p><p style="font-size:12px;word-break:break-all">${safeLink}</p></main></body></html>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
    },
  };
}

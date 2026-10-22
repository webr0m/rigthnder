import { randomBytes, createHash, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { createRecoveryMailer } from './mail.mjs';

const derive = promisify(scrypt);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const ACCEPTED = {
  ok: true,
  message:
    'Si tienes una cuenta con contraseña, recibirás un enlace para recuperarla. Revisa también el correo no deseado.',
};
const INVALID = 'El enlace no es válido o ya venció. Solicita uno nuevo.';
const UNAVAILABLE = 'La recuperación por correo no está disponible ahora. Inténtalo más tarde.';

export function mountRecovery(app, db, { production, parse, recoveryMailer } = {}) {
  const mailer = recoveryMailer === undefined ? createRecoveryMailer() : recoveryMailer;
  const limit = (count) =>
    rateLimit({
      windowMs: 15 * 60000,
      limit: count,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Demasiados intentos. Prueba de nuevo en 15 minutos.' },
    });
  app.post('/api/auth/forgot-password', limit(5), async (req, res) => {
    const { email, language } = parse(
      z.object({
        email: z
          .email('Escribe un correo válido.')
          .max(160)
          .transform((v) => v.toLowerCase()),
        language: z.enum(['es', 'en', 'de']).default('es'),
      }),
      req.body,
    );
    if (!mailer) return res.status(503).json({ error: UNAVAILABLE });
    const now = Date.now(),
      emailHash = hash(email);
    db.prepare('DELETE FROM password_resets WHERE expires_at <= ?').run(now);
    db.prepare('DELETE FROM password_reset_requests WHERE window_start <= ?').run(now - 3600000);
    const last = db
      .prepare('SELECT * FROM password_reset_requests WHERE email_hash=?')
      .get(emailHash);
    // Same response and cooldown for existing and nonexistent addresses. Cap mail per account too.
    if (!last || (now - last.last_sent_at >= 60000 && last.count < 5)) {
      db.prepare(
        `INSERT INTO password_reset_requests VALUES (?,?,?,1)
        ON CONFLICT(email_hash) DO UPDATE SET last_sent_at=excluded.last_sent_at, count=count+1`,
      ).run(emailHash, now, now);
      const user = db
        .prepare(
          'SELECT id,email,password FROM users WHERE email=? AND demo=0 AND seed=0 AND password IS NOT NULL',
        )
        .get(email);
      if (user) {
        const token = randomBytes(32).toString('hex'),
          tokenHash = hash(token);
        db.prepare('DELETE FROM password_resets WHERE user_id=?').run(user.id);
        db.prepare('INSERT INTO password_resets VALUES (?,?,?,?)').run(
          tokenHash,
          user.id,
          hash(user.password),
          now + 30 * 60000,
        );
        // Do not wait for SMTP: delivery timing must not disclose whether an account exists.
        Promise.resolve()
          .then(() => mailer.sendReset({ email: user.email, token, language }))
          .catch(() => {
            try {
              db.prepare('DELETE FROM password_resets WHERE token_hash=?').run(tokenHash);
            } catch {}
            console.error('OnlyFachos: no se pudo entregar un correo de recuperación.');
          });
      }
    }
    await delay(200);
    res.status(202).json(ACCEPTED);
  });

  app.post('/api/auth/reset-password', limit(10), async (req, res) => {
    const { token, password } = parse(
      z.object({
        token: z.string().regex(/^[a-f0-9]{64}$/, INVALID),
        password: z
          .string()
          .min(10, 'La contraseña debe tener al menos 10 caracteres.')
          .max(128, 'La contraseña no puede superar los 128 caracteres.'),
      }),
      req.body,
    );
    const tokenHash = hash(token);
    const valid = () =>
      db
        .prepare(
          `SELECT u.id,u.password,p.credential_hash FROM password_resets p
      JOIN users u ON u.id=p.user_id WHERE p.token_hash=? AND p.expires_at>?
      AND u.demo=0 AND u.seed=0 AND u.password IS NOT NULL`,
        )
        .get(tokenHash, Date.now());
    if (!valid()) return res.status(400).json({ error: INVALID });
    const salt = randomBytes(16).toString('hex'),
      key = await derive(password, salt, 64);
    // Re-check after scrypt inside a transaction: concurrent uses cannot redeem the same link.
    db.exec('BEGIN IMMEDIATE');
    try {
      const user = valid();
      if (!user || hash(user.password) !== user.credential_hash) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: INVALID });
      }
      db.prepare('UPDATE users SET password=? WHERE id=?').run(
        `${salt}:${key.toString('hex')}`,
        user.id,
      );
      db.prepare('DELETE FROM password_resets WHERE user_id=?').run(user.id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.clearCookie('rigthnder_session', {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
    });
    res.json({ ok: true });
  });
  return Boolean(mailer);
}

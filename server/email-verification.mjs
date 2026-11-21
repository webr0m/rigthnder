import { createHash, randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const TOKEN_TTL = 24 * 60 * 60_000;
const COOLDOWN = 15 * 60_000;
const WINDOW = 24 * 60 * 60_000;
const ACCEPTED = {
  ok: true,
  message:
    'Si la cuenta necesita verificación, recibirás un enlace. Revisa también el correo no deseado.',
};
const INVALID = 'El enlace no es válido o ya venció. Solicita uno nuevo.';
const UNAVAILABLE = 'La verificación por correo no está disponible ahora. Inténtalo más tarde.';

function recordRequest(db, email, now) {
  db.prepare(
    `INSERT INTO email_verification_requests VALUES (?,?,?,1)
    ON CONFLICT(email_hash) DO UPDATE SET last_sent_at=excluded.last_sent_at,
    window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END,
    count=CASE WHEN window_start<=? THEN 1 ELSE count+1 END`,
  ).run(hash(email), now, now, now - WINDOW, now - WINDOW);
}

export function issueEmailVerification(db, mailer, user, language = 'es', record = true) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hash(token);
  const now = Date.now();
  db.prepare('DELETE FROM email_verifications WHERE user_id=?').run(user.id);
  db.prepare('INSERT INTO email_verifications VALUES (?,?,?,?,NULL)').run(
    tokenHash,
    user.id,
    now + TOKEN_TTL,
    now,
  );
  if (record) recordRequest(db, user.email, now);
  Promise.resolve()
    .then(() => mailer.sendVerification({ email: user.email, token, language }))
    .catch(() => {
      try {
        db.prepare('DELETE FROM email_verifications WHERE token_hash=?').run(tokenHash);
      } catch {}
      console.error('OnlyFachos: no se pudo entregar un correo de verificación.');
    });
}

export function mountEmailVerification(app, db, { parse, mailer } = {}) {
  const limit = (count) =>
    rateLimit({
      windowMs: 15 * 60000,
      limit: count,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Demasiados intentos. Prueba de nuevo en 15 minutos.' },
    });
  app.post('/api/auth/resend-verification', limit(5), async (req, res) => {
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
    if (typeof mailer?.sendVerification !== 'function')
      return res.status(503).json({ error: UNAVAILABLE });
    const now = Date.now();
    db.prepare(
      'DELETE FROM email_verifications WHERE expires_at<=? OR consumed_at IS NOT NULL',
    ).run(now);
    db.prepare('DELETE FROM email_verification_requests WHERE window_start<=?').run(now - WINDOW);
    const last = db
      .prepare('SELECT * FROM email_verification_requests WHERE email_hash=?')
      .get(hash(email));
    const allowed = !last || (now - last.last_sent_at >= COOLDOWN && last.count < 5);
    if (allowed) {
      recordRequest(db, email, now);
      const user = db
        .prepare(
          'SELECT * FROM users WHERE email=? AND demo=0 AND seed=0 AND password IS NOT NULL AND email_verified_at IS NULL',
        )
        .get(email);
      if (user) issueEmailVerification(db, mailer, user, language, false);
    }
    // Keep both the bookkeeping and response timing independent of account existence.
    await new Promise((resolve) => setTimeout(resolve, 200));
    res.status(202).json(ACCEPTED);
  });

  app.post('/api/auth/verify-email', limit(10), async (req, res) => {
    const { token } = parse(
      z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, INVALID) }),
      req.body,
    );
    const tokenHash = hash(token);
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = db
        .prepare(
          `SELECT u.id FROM email_verifications v
           JOIN users u ON u.id=v.user_id
           WHERE v.token_hash=? AND v.expires_at>? AND v.consumed_at IS NULL
           AND u.demo=0 AND u.seed=0 AND u.password IS NOT NULL AND u.email_verified_at IS NULL`,
        )
        .get(tokenHash, Date.now());
      if (!row) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: INVALID });
      }
      const now = Date.now();
      db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(now, row.id);
      db.prepare('UPDATE email_verifications SET consumed_at=? WHERE token_hash=?').run(
        now,
        tokenHash,
      );
      db.prepare('DELETE FROM email_verifications WHERE user_id=? AND token_hash<>?').run(
        row.id,
        tokenHash,
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.json({ ok: true });
  });
  return typeof mailer?.sendVerification === 'function';
}

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ownProfile, publicProfile, settingsOf } from './db.mjs';
import { commonItems } from './community.mjs';

export function proposalsFor(db, conversationId) {
  return db
    .prepare(
      `SELECT id,sender_id AS senderId,day,place,timezone,status,created_at AS createdAt
    FROM date_proposals WHERE conversation_id=? ORDER BY created_at DESC,rowid DESC`,
    )
    .all(conversationId);
}
export function mountBeta(app, db, { auth, parse, accessibleTarget, accessibleMatch }) {
  const get = (id) => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  const dateMessage = (conversationId, senderId, text) =>
    db
      .prepare(
        'INSERT INTO messages (id,match_id,sender_id,text,created_at,kind) VALUES (?,?,?,?,?,?)',
      )
      .run(randomUUID(), conversationId, senderId, text, Date.now(), 'text');
  const profile = (user) => ({ ...ownProfile(user), email: user.email, birthdate: user.birthdate });
  app.put('/api/me/settings', auth, (req, res) => {
    const boolean = z.boolean().optional();
    const p = parse(
      z
        .object({
          appearance: z.enum(['light', 'dark', 'auto']).optional(),
          language: z.enum(['es', 'en', 'de']).optional(),
          messages: boolean,
          dates: boolean,
          news: boolean,
          hideParty: boolean,
          hideFaith: boolean,
          paused: boolean,
        })
        .strict(),
      req.body,
    );
    db.prepare('UPDATE users SET settings_json=? WHERE id=?').run(
      JSON.stringify({ ...settingsOf(req.user), ...p }),
      req.user.id,
    );
    res.json(profile(get(req.user.id)));
  });
  app.get('/api/me/stats', auth, (req, res) => {
    res.json({
      visits: db
        .prepare('SELECT count(DISTINCT viewer_id) AS n FROM profile_visits WHERE target_id=?')
        .get(req.user.id).n,
      chats: db
        .prepare('SELECT count(*) AS n FROM matches WHERE user_a=? OR user_b=?')
        .get(req.user.id, req.user.id).n,
      dates: db
        .prepare(
          `SELECT count(DISTINCT p.conversation_id) AS n FROM date_proposals p JOIN matches m ON m.id=p.conversation_id
        WHERE p.status='accepted' AND (m.user_a=? OR m.user_b=?)`,
        )
        .get(req.user.id, req.user.id).n,
    });
  });
  app.get('/api/people/:id', auth, (req, res) => {
    const target = req.params.id === req.user.id ? req.user : accessibleTarget(req, req.params.id);
    if (target.id !== req.user.id && settingsOf(target).paused)
      return res.status(404).json({ error: 'Este perfil está pausado.' });
    const p = publicProfile(target);
    res.json({ ...p, common: commonItems(publicProfile(req.user), p) });
  });
  // A visit is explicit; a prefetch or a list refresh never increments statistics.
  app.post('/api/people/:id/visit', auth, (req, res) => {
    const target = accessibleTarget(req, req.params.id);
    if (settingsOf(target).paused)
      return res.status(404).json({ error: 'Este perfil está pausado.' });
    db.prepare('INSERT OR IGNORE INTO profile_visits VALUES (?,?,?)').run(
      target.id,
      req.user.id,
      new Date().toISOString().slice(0, 10),
    );
    res.status(201).json({ ok: true });
  });
  app.get('/api/me/blocked', auth, (req, res) =>
    res.json(
      db
        .prepare(
          `SELECT u.id,u.name,u.photo FROM blocks b JOIN users u ON u.id=b.target_id WHERE b.user_id=?`,
        )
        .all(req.user.id),
    ),
  );
  app.delete('/api/me/blocked/:id', auth, (req, res) => {
    db.prepare('DELETE FROM blocks WHERE user_id=? AND target_id=?').run(
      req.user.id,
      req.params.id,
    );
    res.json({ ok: true });
  });
  app.post('/api/me/feedback', auth, (req, res) => {
    const p = parse(
      z.object({
        kind: z.enum(['support', 'pro', 'verification']),
        text: z.string().trim().min(1).max(2000),
      }),
      req.body,
    );
    db.prepare('INSERT INTO beta_feedback VALUES (?,?,?,?,?)').run(
      randomUUID(),
      req.user.id,
      p.kind,
      p.text,
      Date.now(),
    );
    res.status(201).json({ ok: true });
  });
  app.post('/api/conversations/:id/read', auth, (req, res) => {
    accessibleMatch(req, req.params.id);
    // Only acknowledge messages already delivered to the client, not messages arriving concurrently.
    const { through } = parse(
      z.object({
        through: z
          .number()
          .int()
          .min(0)
          .max(Date.now() + 1000),
      }),
      req.body,
    );
    db.prepare(
      `INSERT INTO conversation_reads VALUES (?,?,?) ON CONFLICT(conversation_id,user_id)
      DO UPDATE SET read_at=max(read_at,excluded.read_at)`,
    ).run(req.params.id, req.user.id, through);
    res.json({ ok: true });
  });
  app.post('/api/conversations/:id/proposals', auth, (req, res) => {
    accessibleMatch(req, req.params.id);
    const p = parse(
      z.object({
        day: z.string().datetime({ offset: true }),
        place: z.string().trim().min(3).max(160),
        timezone: z
          .string()
          .max(80)
          .refine((v) => {
            try {
              new Intl.DateTimeFormat('es', { timeZone: v });
              return true;
            } catch {
              return false;
            }
          }),
      }),
      req.body,
    );
    if (Date.parse(p.day) < Date.now())
      return res.status(400).json({ error: 'Elige una fecha futura.' });
    if (
      db
        .prepare("SELECT 1 FROM date_proposals WHERE conversation_id=? AND status='pending'")
        .get(req.params.id)
    )
      return res
        .status(409)
        .json({ error: 'Responde o retira la propuesta pendiente antes de crear otra.' });
    const id = randomUUID();
    db.exec('BEGIN');
    try {
      db.prepare(
        'INSERT INTO date_proposals (id,conversation_id,sender_id,day,place,timezone,created_at) VALUES (?,?,?,?,?,?,?)',
      ).run(id, req.params.id, req.user.id, p.day, p.place, p.timezone, Date.now());
      dateMessage(
        req.params.id,
        req.user.id,
        '☕ Propuesta de cita: ' +
          new Date(p.day).toLocaleString('es-CL', { timeZone: p.timezone }) +
          ' (' +
          p.timezone +
          ') · ' +
          p.place,
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.status(201).json({ id });
  });
  app.post('/api/proposals/:id/answer', auth, (req, res) => {
    const row = db.prepare('SELECT * FROM date_proposals WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Propuesta no disponible.' });
    const match = accessibleMatch(req, row.conversation_id);
    const p = parse(z.object({ accept: z.boolean(), demo: z.boolean().default(false) }), req.body);
    if (p.demo ? !req.user.demo || row.sender_id !== req.user.id : row.sender_id === req.user.id)
      return res
        .status(403)
        .json({ error: 'Solo la otra persona puede aceptar. En demo usa la simulación.' });
    if (row.status !== 'pending')
      return res.status(409).json({ error: 'Esta propuesta ya fue respondida.' });
    db.exec('BEGIN');
    try {
      if (p.accept)
        db.prepare(
          "UPDATE date_proposals SET status='superseded' WHERE conversation_id=? AND status='accepted'",
        ).run(row.conversation_id);
      db.prepare('UPDATE date_proposals SET status=? WHERE id=?').run(
        p.accept ? 'accepted' : 'declined',
        row.id,
      );
      const actor = p.demo
        ? match.user_a === req.user.id
          ? match.user_b
          : match.user_a
        : req.user.id;
      dateMessage(
        row.conversation_id,
        actor,
        (p.demo ? '[Respuesta simulada · DEMO] ' : '') +
          (p.accept
            ? '☕ Acepto esta propuesta de cita. Día y lugar confirmados: '
            : 'Esta propuesta no me acomoda: ') +
          new Date(row.day).toLocaleString('es-CL', { timeZone: row.timezone }) +
          ' (' +
          row.timezone +
          ') · ' +
          row.place,
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ ok: true });
  });
  app.delete('/api/proposals/:id', auth, (req, res) => {
    const row = db.prepare('SELECT * FROM date_proposals WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Propuesta no disponible.' });
    accessibleMatch(req, row.conversation_id);
    if (row.sender_id !== req.user.id || row.status !== 'pending')
      return res.status(403).json({ error: 'Solo puedes retirar tu propuesta pendiente.' });
    db.exec('BEGIN');
    try {
      db.prepare("UPDATE date_proposals SET status='declined' WHERE id=?").run(row.id);
      dateMessage(
        row.conversation_id,
        req.user.id,
        'Retiré mi propuesta de cita: ' +
          row.place +
          '. El plan confirmado anterior, si lo había, se conserva.',
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ ok: true });
  });
}

import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const roles = new Set(['moderator', 'admin']);
const reportStatuses = new Set(['pending', 'reviewing', 'resolved', 'dismissed']);
const userStatuses = new Set(['active', 'suspended', 'blocked']);

const listSchema = z.object({
  status: z.enum(['all', 'pending', 'reviewing', 'resolved', 'dismissed']).default('pending'),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
const reportUpdateSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed']),
  reason: z.string().trim().min(3).max(500),
});
const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'blocked']),
  reason: z.string().trim().min(3).max(500),
  durationHours: z
    .union([z.number().int().min(1).max(8760), z.null()])
    .optional()
    .default(null),
});

function originGuard(origins) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (!req.headers.origin || !origins.has(req.headers.origin))
      return res.status(403).json({ error: 'Origen administrativo no permitido.' });
    next();
  };
}

function moderatorOnly(auth) {
  return (req, res, next) =>
    auth(req, res, () => {
      if (!roles.has(req.user.moderation_role))
        return res.status(403).json({ error: 'No tienes permisos de moderación.' });
      next();
    });
}

function userSummary(row, prefix = '') {
  if (!row?.[prefix + 'id']) return null;
  return {
    id: row[prefix + 'id'],
    name: row[prefix + 'name'],
    email: row[prefix + 'email'],
    status: row[prefix + 'moderation_status'],
    until: row[prefix + 'moderation_until'],
  };
}

function reportRow(row) {
  return {
    id: row.id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    reporter: userSummary(row, 'reporter_'),
    target: userSummary(row, 'target_'),
  };
}

function auditRow(row) {
  return {
    id: row.id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason,
    metadata: JSON.parse(row.metadata_json || '{}'),
    createdAt: row.created_at,
    actor: userSummary(row, 'actor_'),
    target: userSummary(row, 'target_'),
    reportId: row.report_id || null,
  };
}

function recordAudit(
  db,
  {
    actorId,
    targetId,
    reportId = '',
    action,
    fromStatus = '',
    toStatus = '',
    reason,
    metadata = {},
  },
) {
  db.prepare(
    `INSERT INTO moderation_audit
      (id,actor_user_id,target_user_id,report_id,action,from_status,to_status,reason,metadata_json,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    randomUUID(),
    actorId,
    targetId,
    reportId,
    action,
    fromStatus,
    toStatus,
    reason,
    JSON.stringify(metadata),
    Date.now(),
  );
}

function reportQuery(db, where, values, limit, offset) {
  return db
    .prepare(
      `SELECT r.id,r.reason,r.details,r.created_at,r.status,
        reporter.id AS reporter_id,reporter.name AS reporter_name,reporter.email AS reporter_email,
        reporter.moderation_status AS reporter_moderation_status,reporter.moderation_until AS reporter_moderation_until,
        target.id AS target_id,target.name AS target_name,target.email AS target_email,
        target.moderation_status AS target_moderation_status,target.moderation_until AS target_moderation_until
       FROM reports r
       JOIN users reporter ON reporter.id=r.user_id
       JOIN users target ON target.id=r.target_id
       ${where}
       ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,r.created_at ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...values, limit, offset)
    .map(reportRow);
}

export function mountModeration(app, db, { auth, origins, parse }) {
  const requireModerator = moderatorOnly(auth);
  const adminOrigin = originGuard(origins);

  app.get('/api/moderation/me', requireModerator, (req, res) => {
    res.json({ role: req.user.moderation_role, email: req.user.email });
  });

  app.get('/api/moderation/reports', requireModerator, (req, res) => {
    const query = parse(listSchema, req.query);
    const where =
      query.status === 'all' ? 'WHERE target.demo=0' : 'WHERE r.status=? AND target.demo=0';
    const values = query.status === 'all' ? [] : [query.status];
    const reports = reportQuery(db, where, values, query.limit, query.offset);
    const total = db
      .prepare(
        `SELECT count(*) AS count FROM reports r JOIN users target ON target.id=r.target_id ${where}`,
      )
      .get(...values).count;
    res.json({ reports, total, limit: query.limit, offset: query.offset });
  });

  app.get('/api/moderation/reports/:id', requireModerator, (req, res) => {
    const report = reportQuery(db, 'WHERE r.id=? AND target.demo=0', [req.params.id], 1, 0)[0];
    if (!report) return res.status(404).json({ error: 'Denuncia no encontrada.' });
    const audit = db
      .prepare(
        `SELECT a.*, actor.id AS actor_id,actor.name AS actor_name,actor.email AS actor_email,
          actor.moderation_status AS actor_moderation_status,actor.moderation_until AS actor_moderation_until,
          target.id AS target_id,target.name AS target_name,target.email AS target_email,
          target.moderation_status AS target_moderation_status,target.moderation_until AS target_moderation_until
         FROM moderation_audit a
         LEFT JOIN users actor ON actor.id=a.actor_user_id
         LEFT JOIN users target ON target.id=a.target_user_id
         WHERE a.report_id=? ORDER BY a.created_at DESC`,
      )
      .all(req.params.id)
      .map(auditRow);
    res.json({ report, audit });
  });

  app.patch('/api/moderation/reports/:id', requireModerator, adminOrigin, (req, res) => {
    const input = parse(reportUpdateSchema, req.body);
    if (!reportStatuses.has(input.status))
      return res.status(400).json({ error: 'Estado no válido.' });
    db.exec('BEGIN IMMEDIATE');
    try {
      const report = db
        .prepare(
          `SELECT r.* FROM reports r JOIN users target ON target.id=r.target_id
           WHERE r.id=? AND target.demo=0`,
        )
        .get(req.params.id);
      if (!report) {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'Denuncia no encontrada.' });
      }
      if (report.status === input.status) {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'La denuncia ya tiene ese estado.' });
      }
      db.prepare('UPDATE reports SET status=? WHERE id=?').run(input.status, report.id);
      recordAudit(db, {
        actorId: req.user.id,
        targetId: report.target_id,
        reportId: report.id,
        action: 'report_status',
        fromStatus: report.status,
        toStatus: input.status,
        reason: input.reason,
      });
      db.exec('COMMIT');
      res.json({ ok: true, status: input.status });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  app.get('/api/moderation/audit', requireModerator, (req, res) => {
    const query = parse(
      z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }),
      req.query,
    );
    const audit = db
      .prepare(
        `SELECT a.*, actor.id AS actor_id,actor.name AS actor_name,actor.email AS actor_email,
          actor.moderation_status AS actor_moderation_status,actor.moderation_until AS actor_moderation_until,
          target.id AS target_id,target.name AS target_name,target.email AS target_email,
          target.moderation_status AS target_moderation_status,target.moderation_until AS target_moderation_until
         FROM moderation_audit a
         LEFT JOIN users actor ON actor.id=a.actor_user_id
         LEFT JOIN users target ON target.id=a.target_user_id
         ORDER BY a.created_at DESC LIMIT ?`,
      )
      .all(query.limit)
      .map(auditRow);
    res.json({ audit });
  });

  app.patch('/api/moderation/users/:id/status', requireModerator, adminOrigin, (req, res) => {
    const input = parse(userStatusSchema, req.body);
    if (!userStatuses.has(input.status))
      return res.status(400).json({ error: 'Estado no válido.' });
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'No puedes cambiar tu propio estado.' });
    db.exec('BEGIN IMMEDIATE');
    try {
      const target = db.prepare('SELECT * FROM users WHERE id=? AND demo=0').get(req.params.id);
      if (!target) {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      if (roles.has(target.moderation_role) && req.user.moderation_role !== 'admin') {
        db.exec('ROLLBACK');
        return res.status(403).json({ error: 'Se requiere un administrador para ese usuario.' });
      }
      if (target.moderation_status === input.status && input.status !== 'suspended') {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'El usuario ya tiene ese estado.' });
      }
      const until =
        input.status === 'suspended' && input.durationHours
          ? Date.now() + input.durationHours * 60 * 60_000
          : null;
      db.prepare(
        'UPDATE users SET moderation_status=?,moderation_until=?,moderation_note=? WHERE id=?',
      ).run(input.status, until, input.reason, target.id);
      if (input.status !== 'active')
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);
      if (input.status !== 'active')
        db.prepare('DELETE FROM push_outbox WHERE sender_id=?').run(target.id);
      recordAudit(db, {
        actorId: req.user.id,
        targetId: target.id,
        action: 'user_status',
        fromStatus: target.moderation_status,
        toStatus: input.status,
        reason: input.reason,
        metadata: { durationHours: input.durationHours },
      });
      db.exec('COMMIT');
      res.json({ ok: true, status: input.status, until });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });
}

export { recordAudit };

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { ageOf, publicProfile, ownProfile, settingsOf, VALUES, INTERESTS } from './db.mjs';
import { mountBeta } from './beta.mjs';
import { mountGoogleAuth } from './google.mjs';
import { makeCommunitySchema, mountCommunity } from './community.mjs';
import { birthdateError } from './birthdate.mjs';
import { mountRecovery } from './recovery.mjs';

const scryptAsync = promisify(scrypt);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const validBirthdate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    return !birthdateError(value);
  }, 'Debes tener entre 18 y 100 años.');
const photoSchema = z
  .string()
  .max(2_800_000)
  .refine((value) => {
    if (value === '') return true;
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) return false;
    const [header, payload] = value.split(',');
    const data = Buffer.from(payload, 'base64');
    if (data.length > 2_000_000) return false;
    if (header.includes('jpeg')) return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    if (header.includes('png')) return data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  }, 'La foto debe ser JPG, PNG o WebP y pesar menos de 2 MB.');
const communitySchema = makeCommunitySchema(photoSchema);
const demoCommunitySchema = makeCommunitySchema(
  z.union([
    photoSchema,
    z
      .string()
      .regex(/^\/photos\/(lucia|martin|valentina|tomas|antonella|nicolas|coast|cafe)\.jpg$/),
  ]),
);
const profileSchema = z.object({
  name: z.string().trim().min(2).max(40),
  gender: z.enum(['mujer', 'hombre']),
  city: z.string().trim().min(2).max(60),
  occupation: z.string().trim().max(80).default(''),
  bio: z.string().trim().max(600).default(''),
  values: z
    .array(z.enum(VALUES))
    .min(0)
    .max(6)
    .transform((v) => [...new Set(v)]),
  interests: z
    .array(z.enum(INTERESTS))
    .max(6)
    .transform((v) => [...new Set(v)]),
  intention: z.enum(['Una relación', 'Conocer personas', 'Ver qué pasa']),
  lookingFor: z.enum(['mujer', 'hombre', 'otro', 'todos']),
  prompt: z.string().trim().min(1).max(100),
  answer: z.string().trim().max(250),
  photo: photoSchema.optional(),
  community: z.unknown().optional(),
});

export function createApp(db, options = {}) {
  const app = express();
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const demoEnabled =
    options.demoEnabled ??
    (process.env.DEMO_ENABLED ? process.env.DEMO_ENABLED === 'true' : !production);
  const origins = new Set(
    (
      options.origins ||
      process.env.ALLOWED_ORIGINS ||
      'http://localhost:3000,http://localhost:5173,https://localhost,capacitor://localhost'
    )
      .split(',')
      .map((s) => s.trim()),
  );
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          mediaSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          ...(production ? {} : { upgradeInsecureRequests: null }),
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || origins.has(origin));
      },
      credentials: true,
    }),
  );
  // Keep the legacy API available to installed mobile clients; redirect web pages permanently.
  const canonicalHost = options.canonicalHost ?? process.env.CANONICAL_HOST;
  const legacyHost = options.legacyHost ?? process.env.LEGACY_HOST;
  if (canonicalHost && legacyHost)
    app.use((req, res, next) => {
      if (
        req.hostname === legacyHost &&
        ['GET', 'HEAD'].includes(req.method) &&
        req.path !== '/api' &&
        !req.path.startsWith('/api/')
      )
        return res.redirect(301, 'https://' + canonicalHost + req.originalUrl);
      next();
    });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin &&
      !origins.has(req.headers.origin)
    )
      return res.status(403).json({ error: 'Origen no permitido.' });
    next();
  });
  app.use(express.json({ limit: '3mb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 240,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Demasiadas solicitudes. Espera un minuto.' },
    }),
  );
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Demasiados intentos. Prueba de nuevo en 15 minutos.' },
    }),
  );

  const getUser = (id) => db.prepare('SELECT * FROM users WHERE id=? AND seed=0').get(id);
  const getAny = (id) => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  const blocked = (a, b) =>
    db
      .prepare(
        'SELECT 1 FROM blocks WHERE (user_id=? AND target_id=?) OR (user_id=? AND target_id=?)',
      )
      .get(a, b, b, a);
  function parse(schema, body) {
    const result = schema.safeParse(body);
    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.status = 400;
      throw error;
    }
    return result.data;
  }
  function session(res, user, rememberMe = true) {
    const token = randomBytes(32).toString('hex');
    const duration = (rememberMe ? 30 * 24 : 12) * 60 * 60_000;
    const expiresAt = Date.now() + duration;
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token), user.id, expiresAt);
    res.cookie('rigthnder_session', token, {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      ...(rememberMe ? { maxAge: duration } : {}),
      path: '/',
    });
    return {
      user: { ...ownProfile(user), email: user.email, birthdate: user.birthdate },
      token,
      session: { rememberMe, expiresAt },
    };
  }
  function auth(req, res, next) {
    const token =
      req.headers.authorization?.replace(/^Bearer /, '') ||
      req.headers.cookie
        ?.split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith('rigthnder_session='))
        ?.split('=')[1];
    const found =
      token &&
      db
        .prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?')
        .get(hash(token), Date.now());
    req.user = found && getUser(found.user_id);
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    if (Date.now() - req.user.last_seen > 60_000) {
      req.user.last_seen = Date.now();
      db.prepare('UPDATE users SET last_seen=? WHERE id=?').run(req.user.last_seen, req.user.id);
    }
    next();
  }
  function accessibleTarget(req, id) {
    const target = getAny(id);
    if (
      !target ||
      target.id === req.user.id ||
      !!target.demo !== !!req.user.demo ||
      (req.user.demo && !target.seed) ||
      blocked(req.user.id, id)
    ) {
      const error = new Error('Ese perfil no está disponible.');
      error.status = 404;
      throw error;
    }
    return target;
  }
  function accessibleMatch(req, id) {
    const match = db
      .prepare('SELECT * FROM matches WHERE id=? AND (user_a=? OR user_b=?)')
      .get(id, req.user.id, req.user.id);
    if (!match || blocked(match.user_a, match.user_b)) {
      const error = new Error('Conversación no disponible.');
      error.status = 404;
      throw error;
    }
    return match;
  }
  function makeMatch(a, b) {
    const [first, second] = [a, b].sort();
    const id = randomUUID();
    db.prepare('INSERT OR IGNORE INTO matches VALUES (?,?,?,?)').run(id, first, second, Date.now());
    return db.prepare('SELECT * FROM matches WHERE user_a=? AND user_b=?').get(first, second);
  }

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, name: 'OnlyFachos', version: '1.0.0-beta.1.7', demoEnabled }),
  );
  const googleEnabled = mountGoogleAuth(app, db, {
    production,
    parse,
    session,
    validBirthdate,
    google: options.google,
    communitySchema,
    fetch: options.fetch,
  });
  app.get('/api/options', (_req, res) =>
    res.json({
      values: VALUES,
      interests: INTERESTS,
      demoEnabled,
      googleEnabled,
      passwordRecoveryEnabled,
    }),
  );
  const passwordRecoveryEnabled = mountRecovery(app, db, {
    production,
    parse,
    recoveryMailer: options.recoveryMailer,
  });
  app.post('/api/auth/demo', (_req, res) => {
    if (!demoEnabled) return res.status(403).json({ error: 'La demostración está desactivada.' });
    const { rememberMe } = parse(
      z.object({ rememberMe: z.boolean().default(true) }),
      _req.body || {},
    );
    const id = randomUUID(),
      now = new Date().toISOString();
    // Cada visita recibe un usuario independiente; los perfiles de muestra nunca aparecen a usuarios reales.
    db.prepare(
      `INSERT INTO users (id,name,birthdate,gender,city,occupation,bio,values_json,interests_json,demo,consent_at,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`,
    ).run(
      id,
      'Alex',
      '2000-01-01',
      'otro',
      'Santiago',
      'Mi próxima buena historia',
      'Ideas claras, corazón abierto.',
      JSON.stringify(['Libertad', 'Familia', 'Emprendimiento']),
      JSON.stringify(['Café', 'Viajes', 'Música']),
      now,
      now,
    );
    for (const target of ['demo_lucia', 'demo_martin', 'demo_valentina'])
      db.prepare('INSERT INTO swipes VALUES (?,?,?,?)').run(target, id, 'like', Date.now());
    const match = makeMatch(id, 'demo_nicolas');
    db.prepare(
      'INSERT INTO messages (id,match_id,sender_id,text,created_at) VALUES (?,?,?,?,?)',
    ).run(
      randomUUID(),
      match.id,
      'demo_nicolas',
      '¡Hola! ¿Café y una buena conversación? ☕',
      Date.now(),
    );
    db.prepare('UPDATE users SET community_json=? WHERE id=?').run(
      JSON.stringify({
        ...JSON.parse(getAny('demo_lucia').community_json),
        photos: [],
        completed: false,
      }),
      id,
    );
    // Historial ficticio identificado: permite recorrer la sugerencia tras tres días sin esperar.
    for (const days of [2, 1, 0])
      for (const sender of [id, 'demo_nicolas'])
        db.prepare(
          'INSERT INTO messages (id,match_id,sender_id,text,created_at) VALUES (?,?,?,?,?)',
        ).run(
          randomUUID(),
          match.id,
          sender,
          sender === id
            ? '¿Un café después del trabajo?'
            : 'Me encanta. Tenemos una conversación pendiente ☕',
          Date.now() - days * 86400000 - 60000,
        );
    res.status(201).json(session(res, getUser(id), rememberMe));
  });
  app.post('/api/auth/register', async (req, res) => {
    const data = parse(
      z.object({
        email: z
          .email()
          .max(160)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(10).max(128),
        rememberMe: z.boolean().default(true),
        community: communitySchema.optional(),
        bio: z.string().trim().max(200).default(''),
        occupation: z.string().trim().max(80).default(''),
        lookingFor: z.enum(['mujer', 'hombre', 'otro', 'todos']).default('todos'),
        birthdate: validBirthdate,
        appearance: z.enum(['light', 'dark', 'auto']).default('auto'),
        language: z.enum(['es', 'en', 'de']).default('es'),
        terms: z.literal(true),
        valuesConsent: z.literal(true),
        name: z.string().trim().min(2).max(40),
        city: z.string().trim().min(2).max(60),
        gender: z.enum(['mujer', 'hombre']),
      }),
      req.body,
    );
    const salt = randomBytes(16).toString('hex'),
      key = await scryptAsync(data.password, salt, 64);
    const id = randomUUID(),
      now = new Date().toISOString();
    try {
      db.prepare(
        `INSERT INTO users (id,email,password,name,birthdate,gender,city,values_json,interests_json,consent_at,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        id,
        data.email,
        `${salt}:${key.toString('hex')}`,
        data.name,
        data.birthdate,
        data.gender,
        data.city,
        JSON.stringify(['Libertad']),
        JSON.stringify(['Café']),
        now,
        now,
      );
    } catch (error) {
      if (error.message.includes('UNIQUE'))
        return res
          .status(409)
          .json({ error: 'No se pudo crear la cuenta. Prueba iniciar sesión o usa otro correo.' });
      throw error;
    }
    if (data.community)
      db.prepare(
        'UPDATE users SET community_json=?,photo=?,bio=?,occupation=?,looking_for=?,values_json=? WHERE id=?',
      ).run(
        JSON.stringify(data.community),
        data.community.photos[0],
        data.bio,
        data.occupation,
        data.lookingFor,
        '[]',
        id,
      );
    db.prepare('UPDATE users SET settings_json=? WHERE id=?').run(
      JSON.stringify({ appearance: data.appearance, language: data.language }),
      id,
    );
    res.status(201).json(session(res, getUser(id), data.rememberMe));
  });
  app.post('/api/auth/login', async (req, res) => {
    const data = parse(
      z.object({
        email: z
          .email()
          .max(160)
          .transform((v) => v.toLowerCase()),
        password: z.string().max(128),
        rememberMe: z.boolean().default(true),
      }),
      req.body,
    );
    const user = db.prepare('SELECT * FROM users WHERE email=? AND demo=0').get(data.email);
    const [salt, stored] = (user?.password || 'invalid:00'.repeat(1)).split(':');
    const calculated = await scryptAsync(data.password, salt, 64);
    const expected = stored?.length === 128 ? Buffer.from(stored, 'hex') : Buffer.alloc(64);
    if (
      !user ||
      !timingSafeEqual(expected, calculated) ||
      getUser(user.id)?.password !== user.password
    )
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    res.json(session(res, user, data.rememberMe));
  });
  app.post('/api/auth/logout', auth, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.user.id);
    res.clearCookie('rigthnder_session', {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
    });
    res.json({ ok: true });
  });
  app.get('/api/me', auth, (req, res) =>
    res.json({ ...ownProfile(req.user), email: req.user.email, birthdate: req.user.birthdate }),
  );
  app.put('/api/me', auth, (req, res) => {
    const p = parse(profileSchema, req.body);
    const community =
      p.community && JSON.stringify(p.community) !== req.user.community_json
        ? parse(req.user.demo ? demoCommunitySchema : communitySchema, p.community)
        : null;
    db.prepare(
      `UPDATE users SET name=?,gender=?,city=?,occupation=?,bio=?,values_json=?,interests_json=?,intention=?,looking_for=?,prompt=?,answer=?,photo=?,community_json=? WHERE id=?`,
    ).run(
      p.name,
      p.gender,
      p.city,
      p.occupation,
      p.bio,
      JSON.stringify(p.values),
      JSON.stringify(p.interests),
      p.intention,
      p.lookingFor,
      p.prompt,
      p.answer,
      community?.photos[0] ?? p.photo ?? req.user.photo,
      community ? JSON.stringify(community) : req.user.community_json,
      req.user.id,
    );
    res.json({
      ...ownProfile(getUser(req.user.id)),
      email: req.user.email,
      birthdate: req.user.birthdate,
    });
  });
  app.get('/api/profiles', auth, (req, res) => {
    const filters = parse(
      z.object({
        minAge: z.coerce.number().int().min(18).max(100).default(18),
        maxAge: z.coerce.number().int().min(18).max(100).default(60),
        gender: z.enum(['mujer', 'hombre', 'otro', 'todos']).default(req.user.looking_for),
        city: z.string().max(60).default(''),
        value: z.enum([...VALUES, '']).default(''),
      }),
      req.query,
    );
    if (filters.minAge > filters.maxAge)
      return res.status(400).json({ error: 'El rango de edad no es válido.' });
    const rows = db
      .prepare(
        `SELECT u.* FROM users u WHERE u.id != ? AND u.demo=? AND u.seed=?
      AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.user_id=? AND s.target_id=u.id)
      AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.target_id=u.id) OR (b.user_id=u.id AND b.target_id=?))
      AND NOT EXISTS (SELECT 1 FROM matches m WHERE (m.user_a=? AND m.user_b=u.id) OR (m.user_b=? AND m.user_a=u.id))
      ORDER BY u.created_at DESC`,
      )
      .all(
        req.user.id,
        req.user.demo,
        req.user.demo ? 1 : 0,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
      );
    res.json(
      rows
        .filter((u) => !settingsOf(u).paused)
        .map(publicProfile)
        .filter(
          (p) =>
            p.age >= filters.minAge &&
            p.age <= filters.maxAge &&
            (filters.gender === 'todos' || p.gender === filters.gender) &&
            (!filters.city || p.city.toLowerCase().includes(filters.city.toLowerCase())) &&
            (!filters.value || p.values.includes(filters.value)) &&
            (req.user.demo || p.lookingFor === 'todos' || p.lookingFor === req.user.gender),
        )
        .sort(
          (a, b) =>
            b.values.filter((v) => JSON.parse(req.user.values_json).includes(v)).length -
            a.values.filter((v) => JSON.parse(req.user.values_json).includes(v)).length,
        )
        .slice(0, 30),
    );
  });
  app.post('/api/swipes', auth, (req, res) => {
    const { targetId, action } = parse(
      z.object({ targetId: z.string().max(80), action: z.enum(['like', 'pass', 'super']) }),
      req.body,
    );
    const target = accessibleTarget(req, targetId);
    if (settingsOf(target).paused)
      return res.status(404).json({ error: 'Ese perfil no está disponible.' });
    const existing = db
      .prepare('SELECT 1 FROM swipes WHERE user_id=? AND target_id=?')
      .get(req.user.id, targetId);
    if (existing) return res.status(409).json({ error: 'Ya reaccionaste a este perfil.' });
    db.prepare('INSERT INTO swipes VALUES (?,?,?,?)').run(
      req.user.id,
      targetId,
      action,
      Date.now(),
    );
    const reciprocal =
      action !== 'pass' &&
      db
        .prepare("SELECT 1 FROM swipes WHERE user_id=? AND target_id=? AND action!='pass'")
        .get(targetId, req.user.id);
    const match = reciprocal ? makeMatch(req.user.id, targetId) : null;
    res
      .status(201)
      .json({ match: match ? { id: match.id, profile: publicProfile(target) } : null });
  });
  app.delete('/api/swipes/last', auth, (req, res) => {
    const last = db
      .prepare('SELECT * FROM swipes WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1')
      .get(req.user.id);
    if (!last) return res.status(404).json({ error: 'No hay nada que deshacer.' });
    const [a, b] = [req.user.id, last.target_id].sort();
    if (db.prepare('SELECT 1 FROM matches WHERE user_a=? AND user_b=?').get(a, b))
      return res.status(409).json({
        error: 'Un match no se puede deshacer aquí. Puedes bloquear el perfil en el chat.',
      });
    db.prepare('DELETE FROM swipes WHERE user_id=? AND target_id=?').run(
      req.user.id,
      last.target_id,
    );
    res.json({ ok: true });
  });
  app.get('/api/matches', auth, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM matches WHERE user_a=? OR user_b=? ORDER BY created_at DESC')
      .all(req.user.id, req.user.id);
    res.json(
      rows
        .filter((m) => !blocked(m.user_a, m.user_b))
        .map((m) => ({
          id: m.id,
          createdAt: m.created_at,
          profile: publicProfile(getAny(m.user_a === req.user.id ? m.user_b : m.user_a)),
          lastMessage:
            db
              .prepare(
                'SELECT text,created_at AS createdAt,sender_id AS senderId FROM messages WHERE match_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1',
              )
              .get(m.id) || null,
        })),
    );
  });
  app.get('/api/matches/:id/messages', auth, (req, res) => {
    accessibleMatch(req, req.params.id);
    res.json(
      db
        .prepare(
          'SELECT id,sender_id AS senderId,text,created_at AS createdAt FROM messages WHERE match_id=? ORDER BY created_at,rowid',
        )
        .all(req.params.id),
    );
  });
  app.post('/api/matches/:id/messages', auth, (req, res) => {
    const match = accessibleMatch(req, req.params.id);
    const { text } = parse(z.object({ text: z.string().trim().min(1).max(1000) }), req.body);
    db.prepare(
      'INSERT INTO messages (id,match_id,sender_id,text,created_at) VALUES (?,?,?,?,?)',
    ).run(randomUUID(), match.id, req.user.id, text, Date.now());
    if (req.user.demo) {
      const reply = text.toLowerCase().includes('café')
        ? '¡Ese plan tiene mi voto! ☕ ¿Un café y nos contamos más?'
        : 'Me gusta tu forma de pensar 😊 ¿Qué plan te gustaría para una primera cita?';
      db.prepare(
        'INSERT INTO messages (id,match_id,sender_id,text,created_at) VALUES (?,?,?,?,?)',
      ).run(
        randomUUID(),
        match.id,
        match.user_a === req.user.id ? match.user_b : match.user_a,
        reply,
        Date.now() + 1,
      );
    }
    res.status(201).json({ ok: true });
  });
  app.post('/api/blocks', auth, (req, res) => {
    const { targetId } = parse(z.object({ targetId: z.string().max(80) }), req.body);
    accessibleTarget(req, targetId);
    db.prepare('INSERT OR IGNORE INTO blocks VALUES (?,?)').run(req.user.id, targetId);
    const [a, b] = [req.user.id, targetId].sort();
    db.prepare('DELETE FROM matches WHERE user_a=? AND user_b=?').run(a, b);
    res.status(201).json({ ok: true });
  });
  app.post('/api/reports', auth, (req, res) => {
    const { targetId, reason, details, alsoBlock } = parse(
      z.object({
        targetId: z.string().max(80),
        reason: z.enum([
          'Perfil falso',
          'Acoso o amenazas',
          'Contenido inapropiado',
          'Persona menor de edad',
          'Estafa o solicitud de dinero',
          'Otro',
        ]),
        details: z.string().trim().max(2000).default(''),
        alsoBlock: z.boolean().default(false),
      }),
      req.body,
    );
    accessibleTarget(req, targetId);
    db.prepare(
      'INSERT INTO reports (id,user_id,target_id,reason,created_at,details) VALUES (?,?,?,?,?,?)',
    ).run(randomUUID(), req.user.id, targetId, reason, Date.now(), details);
    if (alsoBlock) {
      db.prepare('INSERT OR IGNORE INTO blocks VALUES (?,?)').run(req.user.id, targetId);
      const [a, b] = [req.user.id, targetId].sort();
      db.prepare('DELETE FROM matches WHERE user_a=? AND user_b=?').run(a, b);
    }
    res.status(201).json({ ok: true });
  });
  app.get('/api/me/export', auth, (req, res) => {
    res.set('Content-Disposition', 'attachment; filename="rigthnder-mis-datos.json"');
    res.json({
      profile: {
        ...ownProfile(req.user),
        email: req.user.email,
        birthdate: req.user.birthdate,
        consentAt: req.user.consent_at,
      },
      swipes: db
        .prepare('SELECT target_id,action,created_at FROM swipes WHERE user_id=?')
        .all(req.user.id),
      messages: db
        .prepare('SELECT text,created_at FROM messages WHERE sender_id=?')
        .all(req.user.id),
      invitations: db
        .prepare(
          'SELECT d.* FROM date_invitations d JOIN matches m ON m.id=d.conversation_id WHERE m.user_a=? OR m.user_b=?',
        )
        .all(req.user.id, req.user.id),
      signals: db.prepare('SELECT * FROM conversation_signals WHERE sender_id=?').all(req.user.id),
      reports: db
        .prepare('SELECT reason,details,created_at,status FROM reports WHERE user_id=?')
        .all(req.user.id),
      proposals: db.prepare('SELECT * FROM date_proposals WHERE sender_id=?').all(req.user.id),
      feedback: db.prepare('SELECT * FROM beta_feedback WHERE user_id=?').all(req.user.id),
      blocks: db.prepare('SELECT target_id FROM blocks WHERE user_id=?').all(req.user.id),
      readStates: db.prepare('SELECT * FROM conversation_reads WHERE user_id=?').all(req.user.id),
    });
  });
  app.delete('/api/me', auth, (req, res) => {
    db.prepare('DELETE FROM users WHERE id=?').run(req.user.id);
    res.clearCookie('rigthnder_session', { path: '/' });
    res.json({ ok: true });
  });
  mountCommunity(app, db, {
    auth,
    parse,
    accessibleTarget,
    accessibleMatch,
    makeMatch,
    communitySchema,
    demoCommunitySchema,
    photoSchema,
  });
  mountBeta(app, db, { auth, parse, accessibleTarget, accessibleMatch });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  const dist = resolve(options.distDirectory || 'dist');
  if (existsSync(dist)) {
    app.use(
      express.static(dist, {
        maxAge: production ? '1h' : 0,
        setHeaders(res, file) {
          if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get('/{*path}', (_req, res) =>
      res.set('Cache-Control', 'no-cache').sendFile(resolve(dist, 'index.html')),
    );
  }
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'El archivo es demasiado grande.' });
    const status = error.status || 500;
    if (status >= 500) console.error('Error del servidor:', error.message);
    res.status(status).json({
      error: status >= 500 ? 'No pudimos completar la solicitud. Intenta de nuevo.' : error.message,
    });
  });
  return app;
}

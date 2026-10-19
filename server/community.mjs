import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { publicProfile } from './db.mjs';

export const PLANS = ['Un café', 'Una cena', 'Un asado', 'Un paseo', 'Sorpréndeme'];
export const STICKERS = [
  'BASADO',
  'TOCA PASTO',
  'GIGACHAD',
  'COPIUM',
  'NPC',
  'DEBATE ME',
  'OK',
  '¿CITA YA?',
];
const short = z.string().trim().max(60);
const tags = z
  .array(short.min(1))
  .max(12)
  .transform((v) => [...new Set(v)]);
export function makeCommunitySchema(photoSchema) {
  return z
    .object({
      photos: z.array(photoSchema).min(2, 'Añade al menos dos fotos propias.').max(6),
      region: short.default(''),
      nationalities: z.array(short).max(2).default([]),
      workMode: z.enum(['Trabajo', 'Estudio', 'Ambos', 'Emprendo', '']).default(''),
      streamers: tags.default([]),
      creators: tags.default([]),
      authors: tags.default([]),
      partyStance: z.enum(['Milito', 'Simpatizo', 'Ninguno', '']).default(''),
      party: short.default(''),
      years: short.default(''),
      current: short.default(''),
      faith: z.enum(['Sí', 'No', 'En búsqueda', '']).default(''),
      denomination: short.default(''),
      children: z.enum(['Sí', 'Ya tengo', 'Algún día', 'No', '']).default(''),
      languages: z
        .array(
          z.object({
            language: short.min(1),
            level: z.enum(['Nativo', 'Avanzado', 'Intermedio', 'Básico']),
          }),
        )
        .max(8)
        .default([]),
      countries: tags.default([]),
      countryCount: z.number().int().min(0).max(195).default(0),
      sensitiveConsent: z.boolean().default(false),
    })
    .superRefine((p, ctx) => {
      if (p.photos.some((v) => !v))
        ctx.addIssue({ code: 'custom', message: 'Añade fotos válidas.' });
      if (
        (p.current ||
          p.years ||
          p.faith ||
          p.denomination ||
          p.partyStance ||
          p.party ||
          p.streamers.length ||
          p.authors.length ||
          p.creators.length) &&
        !p.sensitiveConsent
      )
        ctx.addIssue({
          code: 'custom',
          message:
            'Confirma que quieres publicar tus datos opcionales de política y religión, o déjalos vacíos.',
        });
    })
    .transform((p) => ({
      ...p,
      completed: true,
      sensitiveConsentAt: p.sensitiveConsent ? new Date().toISOString() : null,
      party: ['Milito', 'Simpatizo'].includes(p.partyStance) ? p.party : '',
      denomination: p.faith === 'Sí' ? p.denomination : '',
    }));
}
export function commonItems(a, b) {
  const ac = a.community || {},
    bc = b.community || {};
  return [
    ...(ac.streamers || []).filter((v) => (bc.streamers || []).includes(v)).map((v) => 'Ve ' + v),
    ...(ac.authors || []).filter((v) => (bc.authors || []).includes(v)).map((v) => 'Lee a ' + v),
    ...(ac.creators || [])
      .filter((v) => (bc.creators || []).includes(v))
      .map((v) => 'Sigue a ' + v),
    ...(ac.children && ac.children === bc.children
      ? [ac.children === 'Sí' ? 'Quiere hijos' : 'Hijos: ' + ac.children]
      : []),
    ...(a.interests || []).filter((v) => (b.interests || []).includes(v)),
  ];
}
const dayKey = (time) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(time);
export function streakFor(messages, now = Date.now()) {
  const days = new Map();
  for (const m of messages) {
    const key = dayKey(m.created_at),
      senders = days.get(key) || new Set();
    senders.add(m.sender_id);
    days.set(key, senders);
  }
  let streak = 0,
    cursor = now;
  if ((days.get(dayKey(cursor))?.size || 0) < 2) cursor -= 86400000;
  for (let i = 0; i < 365; i++, cursor -= 86400000) {
    if ((days.get(dayKey(cursor))?.size || 0) < 2) break;
    streak++;
  }
  return streak;
}

export function mountCommunity(
  app,
  db,
  {
    auth,
    parse,
    accessibleTarget,
    accessibleMatch,
    makeMatch,
    communitySchema,
    demoCommunitySchema,
    photoSchema,
  },
) {
  const any = (id) => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  const messagesFor = (id) =>
    db.prepare('SELECT * FROM messages WHERE match_id=? ORDER BY created_at,rowid').all(id);
  function conversation(req, m) {
    const target = publicProfile(any(m.user_a === req.user.id ? m.user_b : m.user_a));
    const messages = messagesFor(m.id),
      last = messages.at(-1);
    return {
      id: m.id,
      profile: target,
      createdAt: m.created_at,
      common: commonItems(publicProfile(req.user), target),
      streak: streakFor(messages),
      messageCount: messages.length,
      basedCount: db
        .prepare(
          "SELECT count(*) AS n FROM message_reactions r JOIN messages msg ON msg.id=r.message_id WHERE msg.match_id=? AND r.reaction='BASADO'",
        )
        .get(m.id).n,
      lastMessage: last
        ? {
            text:
              last.kind === 'image' ? '📷 Foto' : last.kind === 'audio' ? '🎙 Audio' : last.text,
            createdAt: last.created_at,
            senderId: last.sender_id,
          }
        : null,
      invitations: db
        .prepare(
          'SELECT id,sender_id AS senderId,plan,status,day,place,created_at AS createdAt FROM date_invitations WHERE conversation_id=? ORDER BY created_at DESC,rowid DESC',
        )
        .all(m.id),
      signal:
        db
          .prepare(
            'SELECT plan,created_at AS createdAt FROM conversation_signals WHERE conversation_id=? AND sender_id!=?',
          )
          .get(m.id, req.user.id) || null,
    };
  }
  app.put('/api/me/community', auth, (req, res) => {
    const p = parse(req.user.demo ? demoCommunitySchema : communitySchema, req.body);
    db.prepare('UPDATE users SET community_json=?,photo=? WHERE id=?').run(
      JSON.stringify(p),
      p.photos[0],
      req.user.id,
    );
    res.json({
      ...publicProfile(any(req.user.id)),
      email: req.user.email,
      birthdate: req.user.birthdate,
    });
  });
  app.get('/api/community/profiles', auth, (req, res) => {
    const f = parse(
      z.object({
        mode: z.enum(['all', 'online', 'shared', 'near']).default('all'),
        gender: z.enum(['todos', 'hombre', 'mujer', 'otro']).default(req.user.looking_for),
        minAge: z.coerce.number().int().min(18).max(100).default(18),
        maxAge: z.coerce.number().int().min(18).max(100).default(60),
        city: z.string().trim().max(60).default(''),
        q: z.string().trim().max(60).default(''),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
        limit: z.coerce.number().int().min(1).max(24).default(6),
      }),
      req.query,
    );
    if (f.minAge > f.maxAge)
      return res.status(400).json({ error: 'El rango de edad no es válido.' });
    const me = publicProfile(req.user);
    let rows = db
      .prepare(
        `SELECT u.* FROM users u WHERE u.id!=? AND u.demo=? AND u.seed=?
      AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.target_id=u.id) OR (b.user_id=u.id AND b.target_id=?)) ORDER BY u.created_at DESC,u.id`,
      )
      .all(req.user.id, req.user.demo, req.user.demo ? 1 : 0, req.user.id, req.user.id)
      .map(publicProfile);
    rows = rows.filter(
      (p) =>
        p.age >= f.minAge &&
        p.age <= f.maxAge &&
        (f.gender === 'todos' || p.gender === f.gender) &&
        (!f.city || p.city.toLowerCase().includes(f.city.toLowerCase())) &&
        (req.user.demo || p.lookingFor === 'todos' || p.lookingFor === req.user.gender),
    );
    const online = rows.filter((p) => p.online);
    const searchText = (value) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (f.q)
      rows = rows.filter((p) =>
        [
          p.name,
          p.city,
          p.occupation,
          ...(p.community?.streamers || []),
          ...(p.community?.authors || []),
          ...(p.community?.creators || []),
        ].some((v) => searchText(v).includes(searchText(f.q))),
      );
    rows = rows.map((p) => ({ ...p, common: commonItems(me, p) }));
    if (f.mode === 'online') rows = rows.filter((p) => p.online);
    if (f.mode === 'shared')
      rows = rows.filter((p) => p.common.some((s) => /^(Ve |Lee a |Sigue a )/.test(s)));
    if (f.mode === 'near')
      rows = rows.filter(
        (p) =>
          p.city.toLowerCase() === me.city.toLowerCase() &&
          (p.community?.region === 'Fuera de Chile') ===
            (me.community?.region === 'Fuera de Chile'),
      );
    rows.sort((a, b) => b.common.length - a.common.length || a.id.localeCompare(b.id));
    res.json({
      profiles: rows.slice(f.offset, f.offset + f.limit),
      hasMore: rows.length > f.offset + f.limit,
      nextOffset: f.offset + f.limit,
      online: online.map((p) => ({ id: p.id, name: p.name, photo: p.photo, demo: p.demo })),
      total: rows.length,
    });
  });
  app.post('/api/conversations', auth, (req, res) => {
    const { targetId } = parse(z.object({ targetId: z.string().max(80) }), req.body);
    const target = accessibleTarget(req, targetId);
    if (!req.user.demo && target.looking_for !== 'todos' && target.looking_for !== req.user.gender)
      return res.status(404).json({ error: 'Ese perfil no está disponible.' });
    const m = makeMatch(req.user.id, target.id);
    res.status(201).json(conversation(req, m));
  });
  app.get('/api/conversations', auth, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM matches WHERE user_a=? OR user_b=?')
      .all(req.user.id, req.user.id);
    res.json(
      rows
        .filter(
          (m) =>
            !db
              .prepare(
                'SELECT 1 FROM blocks WHERE (user_id=? AND target_id=?) OR (user_id=? AND target_id=?)',
              )
              .get(m.user_a, m.user_b, m.user_b, m.user_a),
        )
        .map((m) => conversation(req, m))
        .sort(
          (a, b) =>
            (b.lastMessage?.createdAt || b.createdAt) - (a.lastMessage?.createdAt || a.createdAt),
        ),
    );
  });
  app.get('/api/conversations/:id', auth, (req, res) => {
    const m = accessibleMatch(req, req.params.id);
    res.json({
      ...conversation(req, m),
      messages: messagesFor(m.id).map((msg) => ({
        id: msg.id,
        senderId: msg.sender_id,
        text: msg.text,
        kind: msg.kind,
        createdAt: msg.created_at,
        reactions: db
          .prepare('SELECT user_id AS userId,reaction FROM message_reactions WHERE message_id=?')
          .all(msg.id),
      })),
    });
  });
  app.post('/api/conversations/:id/messages', auth, (req, res) => {
    const m = accessibleMatch(req, req.params.id);
    const p = parse(
      z.object({
        kind: z.enum(['text', 'sticker', 'image', 'audio']).default('text'),
        text: z.string().min(1).max(2_800_000),
      }),
      req.body,
    );
    if (p.kind === 'text' && (!p.text.trim() || p.text.length > 1000))
      return res.status(400).json({ error: 'Escribe entre 1 y 1000 caracteres.' });
    if (p.kind === 'sticker' && !STICKERS.includes(p.text))
      return res.status(400).json({ error: 'Sticker no válido.' });
    if (p.kind === 'image') parse(photoSchema, p.text);
    if (p.kind === 'audio') {
      const match = /^data:audio\/(webm|mp4|ogg);base64,([A-Za-z0-9+/]+=*)$/.exec(p.text);
      const bytes = match ? Buffer.from(match[2], 'base64') : null;
      if (
        !bytes ||
        bytes.length > 1_500_000 ||
        !(
          bytes.subarray(0, 4).toString('hex') === '1a45dfa3' ||
          bytes.subarray(0, 4).toString() === 'OggS' ||
          bytes.subarray(4, 8).toString() === 'ftyp'
        )
      )
        return res
          .status(400)
          .json({ error: 'El audio debe ser WebM, Ogg o MP4 y pesar menos de 1,5 MB.' });
    }
    db.prepare(
      'INSERT INTO messages (id,match_id,sender_id,text,created_at,kind) VALUES (?,?,?,?,?,?)',
    ).run(randomUUID(), m.id, req.user.id, p.text.trim(), Date.now(), p.kind);
    if (req.user.demo)
      db.prepare(
        'INSERT INTO messages (id,match_id,sender_id,text,created_at) VALUES (?,?,?,?,?)',
      ).run(
        randomUUID(),
        m.id,
        req.user.id === m.user_a ? m.user_b : m.user_a,
        p.kind === 'sticker'
          ? '¡Basado! 😄 ¿Y si seguimos esta conversación con un café?'
          : '¡Me gusta ese plan! ☕ Cuéntame, ¿qué te gusta hacer el fin de semana?',
        Date.now() + 1,
      );
    res.status(201).json({ ok: true });
  });
  app.post('/api/conversations/:id/reactions', auth, (req, res) => {
    accessibleMatch(req, req.params.id);
    const p = parse(
      z.object({ messageId: z.string().max(80), reaction: z.enum(['❤️', '🔥', '😂', 'BASADO']) }),
      req.body,
    );
    if (
      !db
        .prepare('SELECT 1 FROM messages WHERE id=? AND match_id=?')
        .get(p.messageId, req.params.id)
    )
      return res.status(404).json({ error: 'Mensaje no disponible.' });
    const current = db
      .prepare('SELECT reaction FROM message_reactions WHERE message_id=? AND user_id=?')
      .get(p.messageId, req.user.id);
    if (current?.reaction === p.reaction)
      db.prepare('DELETE FROM message_reactions WHERE message_id=? AND user_id=?').run(
        p.messageId,
        req.user.id,
      );
    else
      db.prepare(
        'INSERT INTO message_reactions VALUES (?,?,?) ON CONFLICT(message_id,user_id) DO UPDATE SET reaction=excluded.reaction',
      ).run(p.messageId, req.user.id, p.reaction);
    res.json({ ok: true });
  });
  app.post('/api/conversations/:id/signal', auth, (req, res) => {
    accessibleMatch(req, req.params.id);
    const { plan } = parse(z.object({ plan: z.enum([...PLANS, '']) }), req.body);
    db.prepare(
      'INSERT INTO conversation_signals VALUES (?,?,?,?) ON CONFLICT(conversation_id,sender_id) DO UPDATE SET plan=excluded.plan,created_at=excluded.created_at',
    ).run(req.params.id, req.user.id, plan, Date.now());
    res.status(201).json({ ok: true });
  });
  app.post('/api/conversations/:id/invitations', auth, (req, res) => {
    accessibleMatch(req, req.params.id);
    const { plan } = parse(z.object({ plan: z.enum(PLANS) }), req.body);
    if (
      db
        .prepare("SELECT 1 FROM date_invitations WHERE conversation_id=? AND status='pending'")
        .get(req.params.id)
    )
      return res
        .status(409)
        .json({ error: 'Ya hay una invitación pendiente en esta conversación.' });
    const id = randomUUID();
    db.prepare(
      'INSERT INTO date_invitations (id,conversation_id,sender_id,plan,created_at) VALUES (?,?,?,?,?)',
    ).run(id, req.params.id, req.user.id, plan, Date.now());
    res.status(201).json({ id });
  });
  function invitation(req, id) {
    const row = db.prepare('SELECT * FROM date_invitations WHERE id=?').get(id);
    if (!row) {
      const error = new Error('Invitación no disponible.');
      error.status = 404;
      throw error;
    }
    accessibleMatch(req, row.conversation_id);
    return row;
  }
  app.post('/api/invitations/:id/answer', auth, (req, res) => {
    const row = invitation(req, req.params.id);
    if (row.sender_id === req.user.id)
      return res.status(403).json({ error: 'Solo la otra persona puede responder.' });
    const { accept } = parse(z.object({ accept: z.boolean() }), req.body);
    if (
      !db
        .prepare("UPDATE date_invitations SET status=? WHERE id=? AND status='pending'")
        .run(accept ? 'accepted' : 'declined', row.id).changes
    )
      return res.status(409).json({ error: 'Esta invitación ya fue respondida.' });
    res.json({ ok: true });
  });
  app.post('/api/invitations/:id/demo-answer', auth, (req, res) => {
    const row = invitation(req, req.params.id);
    if (!req.user.demo || row.sender_id !== req.user.id)
      return res.status(403).json({ error: 'Solo disponible en tu demostración.' });
    const { accept } = parse(z.object({ accept: z.boolean() }), req.body);
    if (
      !db
        .prepare("UPDATE date_invitations SET status=? WHERE id=? AND status='pending'")
        .run(accept ? 'accepted' : 'declined', row.id).changes
    )
      return res.status(409).json({ error: 'Esta invitación ya fue respondida.' });
    res.json({ ok: true });
  });
  app.patch('/api/invitations/:id', auth, (req, res) => {
    const row = invitation(req, req.params.id);
    if (row.status !== 'accepted')
      return res.status(409).json({ error: 'Primero deben aceptar la invitación.' });
    const p = parse(
      z.object({
        day: z
          .string()
          .max(16)
          .refine(
            (v) =>
              v === '' ||
              (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) && Number.isFinite(Date.parse(v))),
            'Elige un día y hora válidos.',
          ),
        place: z.string().trim().max(120),
      }),
      req.body,
    );
    db.prepare('UPDATE date_invitations SET day=?,place=? WHERE id=?').run(p.day, p.place, row.id);
    res.json({ ok: true });
  });
}

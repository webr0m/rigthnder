import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
const hash = (v) => createHash('sha256').update(v).digest('hex');
const cookieValue = (req, name) =>
  req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + '='))
    ?.split('=')[1];

export function mountGoogleAuth(
  app,
  db,
  { production, parse, session, validBirthdate, google, communitySchema, fetch: fetchImpl = fetch },
) {
  const config = google || {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  };
  const enabled = !!(config.clientId && config.clientSecret && config.redirectUri);
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60_000,
  };
  const pendingTicket = (req) => req.body?.ticket || cookieValue(req, 'rigthnder_google_pending');
  app.get('/api/auth/google', (req, res) => {
    if (!enabled)
      return res.status(503).json({
        error:
          'Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI en el servidor para activar Google.',
      });
    const native = req.query.native === '1';
    const challenge = native ? req.query.challenge : '';
    if (native && !/^[A-Za-z0-9_-]{43}$/.test(challenge || ''))
      return res.status(400).json({ error: 'Falta el comprobante de acceso móvil.' });
    for (const table of ['oauth_states', 'oauth_pending', 'oauth_handoffs'])
      db.prepare(`DELETE FROM ${table} WHERE expires_at < ?`).run(Date.now());
    const state = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO oauth_states VALUES (?,?,?,?)').run(
      hash(state),
      native ? 1 : 0,
      challenge,
      Date.now() + 10 * 60_000,
    );
    res.cookie('rigthnder_oauth_state', state, cookieOptions);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    res.redirect(url.toString());
  });
  app.get('/api/auth/google/callback', async (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const saved =
      state &&
      db
        .prepare('SELECT * FROM oauth_states WHERE state_hash=? AND expires_at>?')
        .get(hash(state), Date.now());
    if (!saved || cookieValue(req, 'rigthnder_oauth_state') !== state)
      return res.status(400).json({
        error:
          'La solicitud de Google expiró o no coincide con este navegador. Vuelve a iniciar sesión.',
      });
    db.prepare('DELETE FROM oauth_states WHERE state_hash=?').run(hash(state));
    res.clearCookie('rigthnder_oauth_state', cookieOptions);
    const fail = (message) =>
      res.redirect(
        saved.native
          ? 'com.rigthnder.app://auth?error=' + encodeURIComponent(message)
          : config.publicUrl + '/?oauth_error=' + encodeURIComponent(message),
      );
    if (!enabled || req.query.error || typeof req.query.code !== 'string')
      return fail('Se canceló el acceso con Google.');
    try {
      const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: req.query.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!tokenResponse.ok) throw new Error('exchange');
      const tokens = await tokenResponse.json();
      if (!tokens.access_token) throw new Error('token');
      const infoResponse = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: 'Bearer ' + tokens.access_token },
        signal: AbortSignal.timeout(15_000),
      });
      if (!infoResponse.ok) throw new Error('userinfo');
      const info = await infoResponse.json();
      if (!info.sub || !info.email || info.email_verified !== true) throw new Error('unverified');
      const existing = db
        .prepare('SELECT * FROM users WHERE google_sub=? AND demo=0')
        .get(info.sub);
      if (
        !existing &&
        db.prepare('SELECT 1 FROM users WHERE email=?').get(info.email.toLowerCase())
      )
        return fail(
          'Este correo ya usa contraseña. Inicia sesión con ella; vincular cuentas estará disponible en una próxima versión.',
        );
      let payload;
      if (existing) payload = { userId: existing.id };
      else {
        const ticket = randomBytes(32).toString('hex');
        const identity = {
          sub: info.sub,
          email: info.email.toLowerCase(),
          name: (info.given_name || info.name || '').slice(0, 40),
        };
        db.prepare('INSERT INTO oauth_pending VALUES (?,?,?)').run(
          hash(ticket),
          JSON.stringify(identity),
          Date.now() + 10 * 60_000,
        );
        payload = { ticket, identity: { name: identity.name, email: identity.email } };
      }
      if (saved.native) {
        const code = randomBytes(32).toString('hex');
        db.prepare('INSERT INTO oauth_handoffs VALUES (?,?,?,?)').run(
          hash(code),
          JSON.stringify(payload),
          saved.challenge,
          Date.now() + 2 * 60_000,
        );
        return res.redirect('com.rigthnder.app://auth?code=' + code);
      }
      if (existing) session(res, existing);
      else res.cookie('rigthnder_google_pending', payload.ticket, cookieOptions);
      res.redirect(config.publicUrl + (existing ? '/?google=ok' : '/?google=complete'));
    } catch {
      fail('No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.');
    }
  });
  app.post('/api/auth/google/exchange', (req, res) => {
    const { code, verifier } = parse(
      z.object({ code: z.string().length(64), verifier: z.string().min(43).max(128) }),
      req.body,
    );
    const row = db
      .prepare('SELECT * FROM oauth_handoffs WHERE code_hash=? AND expires_at>?')
      .get(hash(code), Date.now());
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    if (!row || row.challenge !== challenge)
      return res.status(401).json({ error: 'El enlace de acceso no es válido o expiró.' });
    db.prepare('DELETE FROM oauth_handoffs WHERE code_hash=?').run(hash(code));
    const payload = JSON.parse(row.payload);
    if (payload.userId) {
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(payload.userId);
      if (!user) return res.status(401).json({ error: 'La cuenta ya no está disponible.' });
      return res.json(session(res, user));
    }
    res.json(payload);
  });
  app.get('/api/auth/google/pending', (req, res) => {
    const ticket = cookieValue(req, 'rigthnder_google_pending');
    const row =
      ticket &&
      db
        .prepare('SELECT * FROM oauth_pending WHERE ticket_hash=? AND expires_at>?')
        .get(hash(ticket), Date.now());
    if (!row) return res.status(404).json({ error: 'El registro con Google expiró.' });
    const identity = JSON.parse(row.payload);
    res.json({ identity: { name: identity.name, email: identity.email } });
  });
  app.post('/api/auth/google/complete', (req, res) => {
    const ticket = pendingTicket(req);
    const row =
      typeof ticket === 'string' &&
      db
        .prepare('SELECT * FROM oauth_pending WHERE ticket_hash=? AND expires_at>?')
        .get(hash(ticket), Date.now());
    if (!row) return res.status(401).json({ error: 'Vuelve a iniciar sesión con Google.' });
    const p = parse(
      z.object({
        name: z.string().trim().min(2).max(40),
        birthdate: validBirthdate,
        appearance: z.enum(['light', 'dark', 'auto']).default('auto'),
        language: z.enum(['es', 'en', 'de']).default('es'),
        gender: z.enum(['mujer', 'hombre']),
        city: z.string().trim().min(2).max(60),
        terms: z.literal(true),
        valuesConsent: z.literal(true),
        community: communitySchema.optional(),
        bio: z.string().trim().max(200).default(''),
        occupation: z.string().trim().max(80).default(''),
        lookingFor: z.enum(['mujer', 'hombre', 'otro', 'todos']).default('todos'),
      }),
      req.body,
    );
    const identity = JSON.parse(row.payload),
      id = randomUUID(),
      now = new Date().toISOString();
    try {
      db.prepare(
        `INSERT INTO users (id,email,google_sub,name,birthdate,gender,city,values_json,interests_json,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        id,
        identity.email,
        identity.sub,
        p.name,
        p.birthdate,
        p.gender,
        p.city,
        JSON.stringify(['Libertad']),
        JSON.stringify(['Café']),
        now,
        now,
      );
    } catch {
      return res
        .status(409)
        .json({ error: 'Ese correo ya tiene una cuenta. Vuelve a iniciar sesión.' });
    }
    if (p.community)
      db.prepare(
        'UPDATE users SET community_json=?,photo=?,bio=?,occupation=?,looking_for=?,values_json=? WHERE id=?',
      ).run(
        JSON.stringify(p.community),
        p.community.photos[0],
        p.bio,
        p.occupation,
        p.lookingFor,
        '[]',
        id,
      );
    db.prepare('DELETE FROM oauth_pending WHERE ticket_hash=?').run(hash(ticket));
    db.prepare('UPDATE users SET settings_json=? WHERE id=?').run(
      JSON.stringify({ appearance: p.appearance, language: p.language }),
      id,
    );
    res.clearCookie('rigthnder_google_pending', cookieOptions);
    res.status(201).json(session(res, db.prepare('SELECT * FROM users WHERE id=?').get(id)));
  });
  return enabled;
}

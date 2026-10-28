import webPush from 'web-push';
import { randomUUID, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { settingsOf } from './db.mjs';

export function validPushEndpoint(value) {
  try {
    const u = new URL(value);
    return (
      value.length <= 2048 &&
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(
        u.hostname,
      ) ||
        u.hostname.endsWith('.push.apple.com') ||
        u.hostname.endsWith('.notify.windows.com'))
    );
  } catch {
    return false;
  }
}
export function pushPayload(kind, language = 'es') {
  const messages = {
    es: { messages: 'Tienes un mensaje nuevo.', dates: 'Hay novedades sobre una cita.' },
    en: { messages: 'You have a new message.', dates: 'There is an update about a date.' },
    de: { messages: 'Du hast eine neue Nachricht.', dates: 'Es gibt Neuigkeiten zu einem Date.' },
  };
  return {
    title: 'OnlyFachos',
    body: (messages[language] || messages.es)[kind],
    url: '/?open=chats',
    tag: 'onlyfachos-' + kind,
  };
}
export function createPushService(db, config = {}) {
  const vapid = config.vapid || {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
    subject: process.env.WEB_PUSH_SUBJECT || 'mailto:admin@webrom.cc',
  };
  let fcm = config.fcm;
  if (!fcm && process.env.FCM_CREDENTIALS_PATH) {
    try {
      fcm = JSON.parse(readFileSync(process.env.FCM_CREDENTIALS_PATH, 'utf8'));
    } catch {
      console.error('OnlyFachos: configuración privada de FCM no disponible.');
    }
  }
  const webEnabled = !!(vapid.publicKey && vapid.privateKey),
    androidEnabled = !!(fcm?.project_id && fcm?.client_email && fcm?.private_key);
  const sendWeb =
    config.sendWeb ||
    ((subscription, payload) =>
      webPush.sendNotification(subscription, JSON.stringify(payload), {
        vapidDetails: vapid,
        TTL: 300,
        urgency: 'normal',
        timeout: 10_000,
      }));
  let accessToken,
    tokenUntil = 0,
    tokenPending;
  async function fcmAccessToken() {
    if (accessToken && tokenUntil > Date.now() + 60_000) return accessToken;
    if (tokenPending) return tokenPending;
    tokenPending = (async () => {
      const now = Math.floor(Date.now() / 1000);
      const b64 = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
      const unsigned =
        b64({ alg: 'RS256', typ: 'JWT' }) +
        '.' +
        b64({
          iss: fcm.client_email,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600,
        });
      const signature = createSign('RSA-SHA256')
        .update(unsigned)
        .sign(fcm.private_key, 'base64url');
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: unsigned + '.' + signature,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw Error('FCM authentication failed');
      const result = await response.json();
      if (!result.access_token) throw Error('FCM authentication failed');
      accessToken = result.access_token;
      tokenUntil = Date.now() + Math.min(result.expires_in || 3600, 3600) * 1000;
      return accessToken;
    })().finally(() => {
      tokenPending = undefined;
    });
    return tokenPending;
  }
  const sendAndroid =
    config.sendAndroid ||
    (async (token, payload) => {
      const response = await fetch(
        'https://fcm.googleapis.com/v1/projects/' +
          encodeURIComponent(fcm.project_id) +
          '/messages:send',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + (await fcmAccessToken()),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: payload.title, body: payload.body },
              data: { open: 'chats' },
              android: {
                priority: 'normal',
                ttl: '300s',
                notification: { channel_id: 'onlyfachos-activity', tag: payload.tag },
              },
            },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const error = Error('FCM delivery failed');
        error.statusCode = detail.error?.details?.some((x) => x.errorCode === 'UNREGISTERED')
          ? 410
          : response.status;
        throw error;
      }
    });
  let running,
    closed = false,
    timer;
  function allowed(row) {
    const user = db
      .prepare('SELECT * FROM users WHERE id=? AND demo=0 AND seed=0')
      .get(row.user_id);
    return (
      user &&
      settingsOf(user)[row.kind] &&
      db
        .prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>?')
        .get(row.session_hash, Date.now()) &&
      !db
        .prepare(
          'SELECT 1 FROM blocks WHERE (user_id=? AND target_id=?) OR (user_id=? AND target_id=?)',
        )
        .get(row.user_id, row.sender_id, row.sender_id, row.user_id) &&
      user
    );
  }
  function drain() {
    if (closed) return Promise.resolve();
    if (running) return running;
    running = (async () => {
      const rows = db
        .prepare(
          `SELECT o.*,d.user_id,d.session_hash,d.kind AS device_kind,d.destination,d.p256dh,d.auth
        FROM push_outbox o JOIN push_devices d ON d.id=o.device_id WHERE o.available_at<=? ORDER BY o.created_at LIMIT 40`,
        )
        .all(Date.now());
      for (const row of rows) {
        if (closed) break;
        // Passenger may run more than one Node process against the same SQLite
        // file. Lease a delivery before awaiting the provider, so workers do not
        // send the same queued notice concurrently. A crash releases it in 45s.
        const claimed = db
          .prepare('UPDATE push_outbox SET available_at=? WHERE id=? AND available_at<=?')
          .run(Date.now() + 45_000, row.id, Date.now());
        if (!claimed.changes) continue;
        const user = allowed(row);
        if (!user || row.created_at < Date.now() - 5 * 60_000) {
          db.prepare('DELETE FROM push_outbox WHERE id=?').run(row.id);
          continue;
        }
        if (!(row.device_kind === 'web' ? webEnabled : androidEnabled)) continue;
        try {
          const payload = pushPayload(row.kind, settingsOf(user).language);
          if (row.device_kind === 'web')
            await sendWeb(
              { endpoint: row.destination, keys: { p256dh: row.p256dh, auth: row.auth } },
              payload,
            );
          else await sendAndroid(row.destination, payload);
          if (!closed) db.prepare('DELETE FROM push_outbox WHERE id=?').run(row.id);
        } catch (error) {
          if (closed) break;
          if ([404, 410].includes(error.statusCode))
            db.prepare('DELETE FROM push_devices WHERE id=?').run(row.device_id);
          else if (row.attempts >= 2) db.prepare('DELETE FROM push_outbox WHERE id=?').run(row.id);
          else
            db.prepare('UPDATE push_outbox SET attempts=attempts+1,available_at=? WHERE id=?').run(
              Date.now() + 30_000 * (row.attempts + 1),
              row.id,
            );
          // Never log tokens, subscriptions, message contents or provider response bodies.
        }
      }
    })().finally(() => {
      running = undefined;
    });
    return running;
  }
  const service = {
    config: {
      web: webEnabled,
      android: androidEnabled,
      publicKey: webEnabled ? vapid.publicKey : null,
    },
    enqueue(senderId, recipientId, kind) {
      if (!['messages', 'dates'].includes(kind) || senderId === recipientId) return;
      const sender = db.prepare('SELECT demo,seed FROM users WHERE id=?').get(senderId);
      if (!sender || sender.demo || sender.seed) return;
      for (const device of db
        .prepare('SELECT * FROM push_devices WHERE user_id=?')
        .all(recipientId)) {
        const check = { ...device, kind, sender_id: senderId };
        if (!allowed(check)) continue;
        // Coalesce rapid activity so a conversation cannot flood the lock screen.
        if (
          db
            .prepare('SELECT 1 FROM push_outbox WHERE device_id=? AND kind=? AND sender_id=?')
            .get(device.id, kind, senderId)
        )
          continue;
        db.prepare('INSERT INTO push_outbox VALUES (?,?,?,?,0,?,?)').run(
          randomUUID(),
          device.id,
          senderId,
          kind,
          Date.now(),
          Date.now(),
        );
      }
      queueMicrotask(() => drain().catch(() => {}));
    },
    drain,
    start() {
      if (!timer) {
        timer = setInterval(() => drain().catch(() => {}), 30_000);
        timer.unref();
        drain().catch(() => {});
      }
    },
    async close() {
      closed = true;
      clearInterval(timer);
      await running;
    },
  };
  return service;
}

export function mountPush(app, db, { auth, parse, push }) {
  app.get('/api/push/config', (_req, res) => res.json(push.config));
  app.post('/api/push/devices', auth, (req, res) => {
    if (req.user.demo)
      return res.status(400).json({ error: 'Las notificaciones requieren una cuenta real.' });
    const data = parse(
      z.discriminatedUnion('kind', [
        z.object({
          kind: z.literal('web'),
          accountId: z.string().max(80).optional(),
          endpoint: z
            .string()
            .refine(validPushEndpoint, 'El servicio de notificaciones no es válido.'),
          keys: z.object({
            p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
            auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
          }),
        }),
        z.object({
          kind: z.literal('android'),
          accountId: z.string().max(80).optional(),
          token: z
            .string()
            .min(32)
            .max(4096)
            .regex(/^[A-Za-z0-9_:.-]+$/),
        }),
      ]),
      req.body,
    );
    if (data.accountId && data.accountId !== req.user.id)
      return res
        .status(409)
        .json({ error: 'La cuenta cambió. Activa las notificaciones de nuevo.' });
    if (!push.config[data.kind])
      return res
        .status(503)
        .json({ error: 'Las notificaciones aún no están disponibles en este dispositivo.' });
    const destination = data.kind === 'web' ? data.endpoint : data.token;
    // A shared device belongs only to its current account/session. Revoke its old queued notices too.
    const existing = db.prepare('SELECT id FROM push_devices WHERE destination=?').get(destination);
    if (existing) db.prepare('DELETE FROM push_devices WHERE id=?').run(existing.id);
    db.prepare('DELETE FROM push_devices WHERE session_hash=?').run(req.sessionHash);
    const count = db
      .prepare('SELECT count(*) AS n FROM push_devices WHERE user_id=?')
      .get(req.user.id).n;
    if (count >= 10)
      db.prepare(
        'DELETE FROM push_devices WHERE id IN (SELECT id FROM push_devices WHERE user_id=? ORDER BY updated_at LIMIT 1)',
      ).run(req.user.id);
    const id = randomUUID();
    db.prepare('INSERT INTO push_devices VALUES (?,?,?,?,?,?,?,?)').run(
      id,
      req.user.id,
      req.sessionHash,
      data.kind,
      destination,
      data.keys?.p256dh || '',
      data.keys?.auth || '',
      Date.now(),
    );
    res.status(201).json({ id });
  });
  app.delete('/api/push/devices', auth, (req, res) => {
    db.prepare('DELETE FROM push_devices WHERE session_hash=?').run(req.sessionHash);
    res.json({ ok: true });
  });
}

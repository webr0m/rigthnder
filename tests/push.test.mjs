import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
import { createPushService, validPushEndpoint, pushPayload } from '../server/push.mjs';
import webPush from 'web-push';

test('push endpoint allowlist rejects local networks, credentials, spoofed domains and non-HTTPS', () => {
  for (const endpoint of [
    'http://fcm.googleapis.com/x',
    'https://127.0.0.1/x',
    'https://fcm.googleapis.com.attacker.example/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:444/x',
    'https://fcm.googleapis.com/x#fragment',
    'file:///etc/passwd',
  ])
    assert.equal(validPushEndpoint(endpoint), false, endpoint);
  for (const endpoint of [
    'https://fcm.googleapis.com/fcm/send/id',
    'https://updates.push.services.mozilla.com/wpush/v2/id',
    'https://web.push.apple.com/id',
    'https://wns2.notify.windows.com/id',
  ])
    assert.equal(validPushEndpoint(endpoint), true, endpoint);
  assert.deepEqual(Object.keys(pushPayload('messages')).sort(), ['body', 'tag', 'title', 'url']);
  assert.equal(pushPayload('dates', 'en').body, 'There is an update about a date.');
});

test('real message/date push is private, honors preferences, follows the current device owner, and stops on logout/block/delete', async () => {
  const db = openDatabase(':memory:');
  const keys = webPush.generateVAPIDKeys();
  const deliveries = [];
  const app = createApp(db, {
    demoEnabled: true,
    push: {
      vapid: { ...keys, subject: 'mailto:admin@example.com' },
      sendWeb: async (subscription, payload) => deliveries.push({ subscription, payload }),
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const req = async (path, token, body, method = body ? 'POST' : 'GET') => {
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  const register = async (name) =>
    (
      await req('/auth/register', null, {
        name,
        email: name + '@example.com',
        password: 'Push-fixture-2026!',
        birthdate: '1995-01-01',
        gender: 'mujer',
        city: 'Berlin',
        terms: true,
        valuesConsent: true,
      })
    ).data;
  const device = {
    kind: 'web',
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-fixture',
    keys: {
      p256dh: Buffer.alloc(65, 4).toString('base64url'),
      auth: Buffer.alloc(16, 1).toString('base64url'),
    },
  };
  try {
    const a = await register('PushA'),
      b = await register('PushB'),
      c = await register('PushC');
    assert.equal((await req('/push/devices', null, device)).status, 401);
    assert.equal(
      (await req('/push/devices', b.token, { ...device, endpoint: 'https://127.0.0.1/private' }))
        .status,
      400,
    );
    const demo = (await req('/auth/demo', null, {})).data;
    assert.equal((await req('/push/devices', demo.token, device)).status, 400);
    assert.equal((await req('/push/devices', b.token, device)).status, 201);
    assert.deepEqual((await req('/push/devices/current', b.token)).data, {
      enabled: true,
      kind: 'web',
    });
    assert.equal((await req('/push/devices/current', a.token)).data.enabled, false);
    const originalDevice = db.prepare('SELECT id FROM push_devices').get().id;
    assert.equal(
      (await req('/push/devices', b.token, device)).data.id,
      originalDevice,
      'refresh preserves the device and its queued deliveries',
    );
    assert.equal(
      (await req('/push/devices', b.token, { ...device, accountId: a.user.id })).status,
      409,
    );
    assert.equal(db.prepare('SELECT user_id FROM push_devices').get().user_id, b.user.id);
    const conversation = (await req('/conversations', a.token, { targetId: b.user.id })).data;
    await req('/conversations/' + conversation.id + '/messages', a.token, {
      text: 'PRIVATE MESSAGE contents must never be on the lock screen',
    });
    await app.locals.push.drain();
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].payload.body, 'Tienes un mensaje nuevo.');
    assert.doesNotMatch(
      JSON.stringify(deliveries),
      /PRIVATE MESSAGE|PushA|example.com|politi|religio/,
    );
    assert.equal(
      (
        await req('/conversations/' + conversation.id + '/invitations', a.token, {
          plan: 'Un café',
        })
      ).status,
      201,
    );
    await app.locals.push.drain();
    assert.equal(deliveries.length, 2);
    assert.equal(deliveries[1].payload.tag, 'onlyfachos-dates');
    await req('/me/settings', b.token, { messages: false }, 'PUT');
    await req('/conversations/' + conversation.id + '/messages', a.token, {
      text: 'Preference disabled',
    });
    await app.locals.push.drain();
    assert.equal(deliveries.length, 2);
    await req('/me/settings', b.token, { messages: true }, 'PUT');
    // Same browser changes to another account: old account must lose this endpoint.
    await req('/push/devices', c.token, device);
    await req('/conversations/' + conversation.id + '/messages', a.token, {
      text: 'Old account no longer owns the endpoint',
    });
    await app.locals.push.drain();
    assert.equal(deliveries.length, 2);
    await req('/push/devices', b.token, device);
    await req('/auth/logout', b.token, {});
    assert.equal(db.prepare('SELECT count(*) AS n FROM push_devices').get().n, 0);
    await req('/conversations/' + conversation.id + '/messages', a.token, { text: 'Logged out' });
    await app.locals.push.drain();
    assert.equal(deliveries.length, 2);
    const login = (
      await req('/auth/login', null, { email: 'PushB@example.com', password: 'Push-fixture-2026!' })
    ).data;
    await req('/push/devices', login.token, device);
    db.prepare('INSERT INTO blocks VALUES (?,?)').run(a.user.id, b.user.id);
    app.locals.push.enqueue(a.user.id, b.user.id, 'messages');
    await app.locals.push.drain();
    assert.equal(deliveries.length, 2);
    await req('/me', login.token, null, 'DELETE');
    assert.equal(db.prepare('SELECT count(*) AS n FROM push_devices').get().n, 0);
  } finally {
    await app.locals.push.close();
    await new Promise((r) => server.close(r));
    db.close();
  }
});

test('push retries survive service restart, expired endpoints are removed and expired sessions cannot receive', async () => {
  const db = openDatabase(':memory:');
  const now = new Date().toISOString();
  for (const id of ['sender', 'recipient'])
    db.prepare(
      'INSERT INTO users (id,email,name,birthdate,gender,city,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?)',
    ).run(id, id + '@example.com', id, '1990-01-01', 'hombre', 'Berlin', now, now);
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run('session', 'recipient', Date.now() + 60000);
  db.prepare('INSERT INTO push_devices VALUES (?,?,?,?,?,?,?,?)').run(
    'device',
    'recipient',
    'session',
    'web',
    'https://fcm.googleapis.com/x',
    'key',
    'auth',
    Date.now(),
  );
  const vapid = { ...webPush.generateVAPIDKeys(), subject: 'mailto:admin@example.com' };
  let release;
  const providerPending = new Promise((resolve) => {
    release = resolve;
  });
  const first = createPushService(db, {
    vapid,
    sendWeb: async () => {
      await providerPending;
      throw Error('temporary');
    },
  });
  first.enqueue('sender', 'recipient', 'messages');
  await new Promise((resolve) => setImmediate(resolve));
  const concurrent = createPushService(db, {
    vapid,
    sendWeb: () => assert.fail('another worker must respect the in-flight lease'),
  });
  await concurrent.drain();
  await concurrent.close();
  release();
  await first.drain();
  await first.close();
  assert.equal(db.prepare('SELECT attempts FROM push_outbox').get().attempts, 1);
  db.prepare('UPDATE push_outbox SET available_at=0').run();
  const second = createPushService(db, {
    vapid,
    sendWeb: async () => {
      const e = Error('gone');
      e.statusCode = 410;
      throw e;
    },
  });
  await second.drain();
  await second.close();
  assert.equal(db.prepare('SELECT count(*) AS n FROM push_devices').get().n, 0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM push_outbox').get().n, 0);
  db.prepare('INSERT INTO push_devices VALUES (?,?,?,?,?,?,?,?)').run(
    'expired',
    'recipient',
    'session',
    'web',
    'https://fcm.googleapis.com/expired',
    'key',
    'auth',
    Date.now(),
  );
  db.prepare('UPDATE sessions SET expires_at=0').run();
  const last = createPushService(db, {
    vapid,
    sendWeb: () => assert.fail('expired session must not receive'),
  });
  last.enqueue('sender', 'recipient', 'messages');
  await last.drain();
  await last.close();
  db.close();
});

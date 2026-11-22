import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

test('push self-test is authenticated, current-device-only, rate limited and receipt is bound to the owning session', async (t) => {
  const db = openDatabase(':memory:'),
    sent = [];
  const app = createApp(db, {
    push: {
      fcm: { project_id: 'fixture', client_email: 'fixture', private_key: 'fixture' },
      sendAndroid: async (token, payload) => sent.push({ token, payload }),
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await app.locals.push.close();
    await new Promise((r) => server.close(r));
    db.close();
  });
  const request = async (path, token, body) => {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api` + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  const account = async (name) =>
    (
      await request('/auth/register', null, {
        name,
        email: name + '@example.com',
        password: 'Fixture-password-2026',
        birthdate: '1990-01-01',
        gender: 'mujer',
        city: 'Berlin',
        terms: true,
        valuesConsent: true,
      })
    ).data;
  const a = await account('AccountA'),
    b = await account('AccountB');
  assert.equal((await request('/push/test', null, {})).status, 401);
  assert.equal((await request('/push/test', a.token, {})).status, 409);
  assert.equal(
    (
      await request('/push/devices', b.token, {
        kind: 'android',
        accountId: b.user.id,
        token: 'private-device-token-' + 'a'.repeat(32),
      })
    ).status,
    201,
  );
  const result = await request('/push/test', b.token, {});
  assert.equal(result.status, 200);
  assert.equal(result.data.accepted, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.data.testId, result.data.testId);
  assert.ok(!JSON.stringify(result.data).includes(sent[0].token));
  await request('/push/receipts', a.token, { testId: result.data.testId });
  assert.equal((await request('/push/devices/current', b.token)).data.delivery.receivedAt, null);
  await request('/push/receipts', b.token, { testId: result.data.testId });
  const state = (await request('/push/devices/current', b.token)).data;
  assert.ok(state.delivery.receivedAt >= state.delivery.testAt);
  assert.equal((await request('/push/test', b.token, {})).status, 429);
  assert.equal(sent.length, 1);
  await request('/auth/logout', b.token, {});
  assert.equal(db.prepare('SELECT count(*) AS n FROM push_delivery_status').get().n, 0);
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase, ageOf } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

let db, server, base;
before(async () => {
  db = openDatabase(':memory:');
  server = createApp(db, { demoEnabled: true }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});
async function request(path, { token, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, headers: res.headers, data: await res.json() };
}
async function demo() {
  return (await request('/auth/demo', { method: 'POST' })).data;
}
async function account(name) {
  return (
    await request('/auth/register', {
      method: 'POST',
      body: {
        name,
        email: name.toLowerCase() + '@example.com',
        password: 'Rigthnder-test-2026',
        birthdate: '1998-04-15',
        gender: 'otro',
        city: 'Santiago',
        terms: true,
        valuesConsent: true,
      },
    })
  ).data;
}

test('age gate uses exact birthday and rejects invalid dates, minors and missing consent', async () => {
  assert.equal(ageOf('2008-10-15', new Date('2026-10-14T12:00:00Z')), 17);
  const body = {
    name: 'Edad',
    email: 'edad@example.com',
    password: 'Rigthnder-test-2026',
    birthdate: '2026-02-31',
    gender: 'otro',
    city: 'Santiago',
    terms: true,
    valuesConsent: true,
  };
  assert.equal((await request('/auth/register', { method: 'POST', body })).status, 400);
  assert.equal(
    (
      await request('/auth/register', {
        method: 'POST',
        body: { ...body, birthdate: '2020-01-01' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/auth/register', {
        method: 'POST',
        body: { ...body, birthdate: '1999-01-01', valuesConsent: false },
      })
    ).status,
    400,
  );
});
test('registration, password verification and private sessions', async () => {
  const a = await account('Cuenta');
  assert.ok(a.token);
  assert.equal((await request('/me', { token: a.token })).data.email, 'cuenta@example.com');
  assert.equal((await request('/me')).status, 401);
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { email: 'cuenta@example.com', password: 'wrong' },
      })
    ).status,
    401,
  );
  const login = await request('/auth/login', {
    method: 'POST',
    body: { email: 'cuenta@example.com', password: 'Rigthnder-test-2026' },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal(
    db
      .prepare('SELECT password FROM users WHERE id=?')
      .get(a.user.id)
      .password.includes('Rigthnder-test-2026'),
    false,
  );
});
test('demo is isolated between visitors and from real accounts; public profiles omit private fields', async () => {
  const a = await demo(),
    b = await demo();
  assert.notEqual(a.user.id, b.user.id);
  const profiles = await request('/profiles', { token: a.token });
  assert.equal(profiles.status, 200);
  assert.ok(profiles.data.length);
  for (const p of profiles.data) {
    assert.equal(p.demo, true);
    assert.equal(p.email, undefined);
    assert.equal(p.birthdate, undefined);
    assert.equal(p.password, undefined);
  }
  const real = await account('Real');
  const people = await request('/profiles', { token: real.token });
  assert.ok(people.data.every((p) => !p.demo));
  assert.equal(
    (
      await request('/swipes', {
        token: real.token,
        method: 'POST',
        body: { targetId: 'demo_lucia', action: 'like' },
      })
    ).status,
    404,
  );
});
test('only mutual likes create real matches; message access and blocking are enforced', async () => {
  const a = await account('Alice'),
    b = await account('Bruno'),
    intruder = await account('Carla');
  const first = await request('/swipes', {
    token: a.token,
    method: 'POST',
    body: { targetId: b.user.id, action: 'like' },
  });
  assert.equal(first.data.match, null);
  const mutual = await request('/swipes', {
    token: b.token,
    method: 'POST',
    body: { targetId: a.user.id, action: 'like' },
  });
  assert.ok(mutual.data.match.id);
  const matchId = mutual.data.match.id;
  assert.equal(
    (await request(`/matches/${matchId}/messages`, { token: intruder.token })).status,
    404,
  );
  assert.equal(
    (
      await request(`/matches/${matchId}/messages`, {
        token: a.token,
        method: 'POST',
        body: { text: 'Hola, ¿un café?' },
      })
    ).status,
    201,
  );
  const messages = await request(`/matches/${matchId}/messages`, { token: b.token });
  assert.equal(messages.data.length, 1);
  assert.equal(messages.data[0].text, 'Hola, ¿un café?');
  assert.equal(
    (
      await request('/reports', {
        token: a.token,
        method: 'POST',
        body: { targetId: b.user.id, reason: 'Perfil falso' },
      })
    ).status,
    201,
  );
  assert.equal(
    (await request('/blocks', { token: a.token, method: 'POST', body: { targetId: b.user.id } }))
      .status,
    201,
  );
  assert.equal(
    (
      await request(`/matches/${matchId}/messages`, {
        token: b.token,
        method: 'POST',
        body: { text: 'Hola' },
      })
    ).status,
    404,
  );
  assert.ok(!(await request('/profiles', { token: b.token })).data.some((p) => p.id === a.user.id));
});
test('pass can be undone, filters apply and matched reactions cannot be undone', async () => {
  const a = await demo();
  let profiles = (await request('/profiles?gender=hombre&city=Santiago', { token: a.token })).data;
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].name, 'Martín');
  assert.equal(
    (
      await request('/swipes', {
        token: a.token,
        method: 'POST',
        body: { targetId: 'demo_lucia', action: 'pass' },
      })
    ).status,
    201,
  );
  assert.equal((await request('/swipes/last', { token: a.token, method: 'DELETE' })).status, 200);
  const like = await request('/swipes', {
    token: a.token,
    method: 'POST',
    body: { targetId: 'demo_lucia', action: 'super' },
  });
  assert.ok(like.data.match);
  assert.equal((await request('/swipes/last', { token: a.token, method: 'DELETE' })).status, 409);
  assert.equal(
    (
      await request('/swipes', {
        token: a.token,
        method: 'POST',
        body: { targetId: 'demo_lucia', action: 'like' },
      })
    ).status,
    409,
  );
  assert.equal((await request('/profiles?minAge=40&maxAge=20', { token: a.token })).status, 400);
});
test('cross-origin mutations are rejected, stored strings remain data, invalid photos are refused', async () => {
  const a = await demo();
  assert.equal(
    (
      await request('/me', {
        token: a.token,
        method: 'PUT',
        headers: { Origin: 'https://evil.example' },
        body: {},
      })
    ).status,
    403,
  );
  const body = { ...a.user, bio: '<script>alert(1)</script>' };
  delete body.photo;
  assert.equal((await request('/me', { token: a.token, method: 'PUT', body })).data.bio, body.bio);
  assert.equal(
    (
      await request('/me', {
        token: a.token,
        method: 'PUT',
        body: { ...body, photo: 'data:image/png;base64,AAAA' },
      })
    ).status,
    400,
  );
});
test('deleting an account cascades its sessions, swipes, matches, messages, reports and blocks', async () => {
  const a = await demo();
  await request('/swipes', {
    token: a.token,
    method: 'POST',
    body: { targetId: 'demo_lucia', action: 'like' },
  });
  const matches = (await request('/matches', { token: a.token })).data;
  await request('/matches/' + matches[0].id + '/messages', {
    token: a.token,
    method: 'POST',
    body: { text: 'Prueba' },
  });
  const exported = await request('/me/export', { token: a.token });
  assert.equal(exported.status, 200);
  assert.equal(exported.data.profile.id, a.user.id);
  assert.equal((await request('/me', { token: a.token, method: 'DELETE' })).status, 200);
  assert.equal((await request('/me', { token: a.token })).status, 401);
  for (const [table, column] of [
    ['users', 'id'],
    ['sessions', 'user_id'],
    ['swipes', 'user_id'],
    ['messages', 'sender_id'],
    ['reports', 'user_id'],
    ['blocks', 'user_id'],
  ])
    assert.equal(
      db.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${column}=?`).get(a.user.id).n,
      0,
    );
  assert.equal(
    db
      .prepare('SELECT count(*) AS n FROM matches WHERE user_a=? OR user_b=?')
      .get(a.user.id, a.user.id).n,
    0,
  );
});
test('production disables demo by default', async () => {
  const prod = createApp(db, { production: true }).listen(0, '127.0.0.1');
  await once(prod, 'listening');
  const response = await fetch(`http://127.0.0.1:${prod.address().port}/api/auth/demo`, {
    method: 'POST',
  });
  assert.equal(response.status, 403);
  await new Promise((resolve) => prod.close(resolve));
});
test('explicit demo environment flag enables public preview with secure production cookies', async () => {
  const previous = process.env.DEMO_ENABLED;
  process.env.DEMO_ENABLED = 'true';
  const prod = createApp(db, { production: true }).listen(0, '127.0.0.1');
  if(previous === undefined) delete process.env.DEMO_ENABLED;
  else process.env.DEMO_ENABLED = previous;
  await once(prod, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${prod.address().port}/api/auth/demo`, {method:'POST'});
    assert.equal(response.status,201);
    assert.match(response.headers.get('set-cookie'),/Secure/);
  } finally { await new Promise(resolve=>prod.close(resolve)); }
});

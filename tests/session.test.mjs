import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
import { createSessionStore } from '../src/session-store.mjs';

test('remembered login survives server restart; temporary login, expiry and revocation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'onlyfachos-session-'));
  let db, server, base;
  async function start() {
    db = openDatabase(join(directory, 'app.sqlite'));
    server = createApp(db, { demoEnabled: true, production: true }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}/api`;
  }
  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
  const request = (path, body, cookie) =>
    fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    await start();
    const account = {
      name: 'Persistente',
      email: 'session@example.com',
      password: 'OnlyFachos-test-2026',
      birthdate: '1998-04-15',
      gender: 'mujer',
      city: 'Santiago',
      terms: true,
      valuesConsent: true,
      rememberMe: true,
    };
    const registered = await request('/auth/register', account);
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie');
    assert.match(cookie, /Max-Age=2592000/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    const result = await registered.json();
    assert.equal(result.session.rememberMe, true);
    assert.ok(Math.abs(result.session.expiresAt - Date.now() - 30 * 86400000) < 5000);
    const savedCookie = cookie.split(';')[0];
    await stop();
    await start();
    assert.equal((await request('/me', null, savedCookie)).status, 200);
    const login = await request('/auth/login', {
      email: account.email,
      password: account.password,
      rememberMe: false,
    });
    assert.equal(login.status, 200);
    assert.doesNotMatch(login.headers.get('set-cookie'), /Max-Age|Expires/);
    const temporary = await login.json();
    assert.equal(temporary.session.rememberMe, false);
    assert.ok(Math.abs(temporary.session.expiresAt - Date.now() - 12 * 3600000) < 5000);
    const hash = createHash('sha256').update(temporary.token).digest('hex');
    db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(Date.now() - 1, hash);
    assert.equal(
      (await request('/me', null, login.headers.get('set-cookie').split(';')[0])).status,
      401,
    );
    assert.equal((await request('/auth/logout', {}, savedCookie)).status, 200);
    assert.equal((await request('/me', null, savedCookie)).status, 401);
    assert.equal(
      (
        await request('/auth/login', {
          email: account.email,
          password: account.password,
          rememberMe: 'false',
        })
      ).status,
      400,
    );
  } finally {
    if (server?.listening) await stop();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('native remembers encrypted token only when selected and clears expiry and logout', async () => {
  let saved = null;
  const storage = {
    get: async () => saved,
    set: async (value) => {
      saved = structuredClone(value);
    },
    remove: async () => {
      saved = null;
    },
  };
  const factory = () => createSessionStore({ native: true, storage, now: () => 1000 });
  let app = factory();
  await app.save('a'.repeat(64), { rememberMe: true, expiresAt: 2000 });
  assert.deepEqual(Object.keys(saved).sort(), ['expiresAt', 'token']);
  app = factory();
  await app.restore();
  assert.equal(app.getToken(), 'a'.repeat(64));
  await app.save('b'.repeat(64), { rememberMe: false, expiresAt: 2000 });
  assert.equal(app.getToken(), 'b'.repeat(64));
  assert.equal(saved, null);
  const restarted = factory();
  await restarted.restore();
  assert.equal(restarted.getToken(), '');
  await app.save('c'.repeat(64), { rememberMe: true, expiresAt: 2000 });
  await app.clear('b'.repeat(64));
  assert.equal(app.getToken(), 'c'.repeat(64));
  await app.clear();
  assert.equal(saved, null);
  assert.equal(app.getToken(), '');
  saved = { token: 'a'.repeat(64), expiresAt: 999 };
  await app.restore();
  assert.equal(saved, null);
  saved = { token: 'corrupted', expiresAt: 2000 };
  await app.restore();
  assert.equal(saved, null);
});

test('web never persists bearer tokens and native storage failure does not claim success', async () => {
  const storage = {
    get: async () => {
      throw Error('storage');
    },
    set: async () => {
      throw Error('storage');
    },
    remove: async () => {
      throw Error('storage');
    },
  };
  const web = createSessionStore({ storage });
  await web.restore();
  await web.save('a'.repeat(64), { rememberMe: true, expiresAt: Date.now() + 10000 });
  await web.clear();
  assert.equal(web.getToken(), '');
  const native = createSessionStore({ native: true, storage });
  await assert.rejects(
    native.save('a'.repeat(64), { rememberMe: true, expiresAt: Date.now() + 10000 }),
    /storage/,
  );
  assert.equal(native.getToken(), '');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
test('Google OAuth: state binding, verified identity, adult onboarding, one-use native exchange', async () => {
  const db = openDatabase(':memory:');
  const mockFetch = async (url) =>
    new Response(
      JSON.stringify(
        url.includes('/token')
          ? { access_token: 'mock-google-token' }
          : {
              sub: 'google-test-id',
              email: 'google@example.com',
              email_verified: true,
              given_name: 'Google Test',
            },
      ),
      { status: 200 },
    );
  const server = createApp(db, {
    demoEnabled: false,
    google: {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      redirectUri: 'http://localhost/callback',
      publicUrl: 'http://localhost',
    },
    fetch: mockFetch,
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/auth/google`;
  try {
    const start = await fetch(base + '?rememberMe=0', { redirect: 'manual' });
    const url = new URL(start.headers.get('location'));
    const state = url.searchParams.get('state');
    assert.equal(url.hostname, 'accounts.google.com');
    assert.equal(url.searchParams.get('scope'), 'openid email profile');
    assert.ok(state);
    const cookie = 'rigthnder_oauth_state=' + state;
    assert.equal(
      (await fetch(base + '/callback?state=' + state + '&code=mock', { redirect: 'manual' }))
        .status,
      400,
    );
    const callback = await fetch(base + '/callback?state=' + state + '&code=mock', {
      redirect: 'manual',
      headers: { Cookie: cookie },
    });
    assert.equal(callback.status, 302);
    assert.match(callback.headers.get('location'), /google=complete/);
    const pendingCookie = callback.headers
      .get('set-cookie')
      .match(/rigthnder_google_pending=([a-f0-9]+)/)[0];
    assert.match(callback.headers.get('set-cookie'), /Max-Age=3600/);
    const pending = await (
      await fetch(base + '/pending', { headers: { Cookie: pendingCookie } })
    ).json();
    assert.equal(pending.rememberMe, false);
    assert.ok(pending.expiresAt > Date.now() + 59 * 60_000);
    // Completing a slow form after the old ten-minute limit must still work.
    db.prepare('UPDATE oauth_pending SET expires_at=?').run(Date.now() + 45 * 60_000);
    const body = {
      name: 'Google Test',
      birthdate: '2020-01-01',
      gender: 'hombre',
      city: 'Santiago',
      terms: true,
      valuesConsent: true,
      appearance: 'light',
      language: 'en',
    };
    const complete = (b) =>
      fetch(base + '/complete', {
        method: 'POST',
        headers: { Cookie: pendingCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      });
    assert.equal((await complete(body)).status, 400);
    const registered = await complete({ ...body, birthdate: '1999-01-01' });
    assert.equal(registered.status, 201);
    const result = await registered.json();
    assert.ok(result.token);
    assert.equal(result.session.rememberMe, false);
    assert.doesNotMatch(
      registered.headers.get('set-cookie').match(/rigthnder_session=[^;]+[^,]*/)[0],
      /Max-Age|Expires/,
    );
    assert.equal(result.user.settings.appearance, 'light');
    assert.equal(result.user.settings.language, 'en');
    assert.equal((await complete({ ...body, birthdate: '1999-01-01' })).status, 401);
    assert.equal(
      (
        await fetch(base + '/callback?state=' + state + '&code=mock', {
          redirect: 'manual',
          headers: { Cookie: cookie },
        })
      ).status,
      400,
    );
    const verifier = 'a'.repeat(64),
      challenge = createHash('sha256').update(verifier).digest('base64url');
    const nativeStart = await fetch(base + '?native=1&challenge=' + challenge, {
      redirect: 'manual',
    });
    const nativeState = new URL(nativeStart.headers.get('location')).searchParams.get('state');
    const nativeCallback = await fetch(base + '/callback?state=' + nativeState + '&code=mock', {
      redirect: 'manual',
      headers: { Cookie: 'rigthnder_oauth_state=' + nativeState },
    });
    const handoff = new URL(nativeCallback.headers.get('location'));
    assert.equal(handoff.protocol, 'com.rigthnder.app:');
    const code = handoff.searchParams.get('code');
    const exchange = (v) =>
      fetch(base + '/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, verifier: v }),
      });
    assert.equal((await exchange('b'.repeat(64))).status, 401);
    const exchanged = await exchange(verifier);
    assert.equal(exchanged.status, 200);
    assert.equal((await exchanged.json()).session.rememberMe, true);
    assert.match(exchanged.headers.get('set-cookie'), /Max-Age=2592000/);
    assert.equal((await exchange(verifier)).status, 401);
    const expiredTicket = 'c'.repeat(64);
    db.prepare('INSERT INTO oauth_pending VALUES (?,?,?)').run(
      createHash('sha256').update(expiredTicket).digest('hex'),
      JSON.stringify({ email: 'expired@example.com' }),
      Date.now() - 1,
    );
    const expired = await fetch(base + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: expiredTicket }),
    });
    assert.equal(expired.status, 401);
    assert.equal((await expired.json()).code, 'GOOGLE_REGISTRATION_EXPIRED');
    const invalid = await fetch(base + '/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: expiredTicket }),
    });
    assert.equal(invalid.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test('Google linking preserves the existing database account and requires password, verified matching email and a live session', async () => {
  const db = openDatabase(':memory:');
  let identity = {
    sub: 'existing-google-sub',
    email: 'existing@example.com',
    email_verified: true,
  };
  const server = createApp(db, {
    demoEnabled: false,
    google: {
      clientId: 'test',
      clientSecret: 'private-test',
      redirectUri: 'http://localhost/callback',
      publicUrl: 'http://localhost',
    },
    fetch: async (url) =>
      Response.json(url.includes('/token') ? { access_token: 'mock' } : identity),
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, token, body) =>
    fetch(base + path, {
      method: body ? 'POST' : 'GET',
      redirect: 'manual',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const password = 'Existing-account-2026!';
  const register = async (email) =>
    await (
      await request('/auth/register', null, {
        email,
        password,
        name: 'Existing Profile',
        birthdate: '1995-01-02',
        gender: 'mujer',
        city: 'Berlin',
        terms: true,
        valuesConsent: true,
      })
    ).json();
  const begin = async (token, extra = {}) => {
    const issued = await request('/auth/google/link', token, { password, ...extra });
    assert.equal(issued.status, 200);
    const url = new URL((await issued.json()).url);
    const start = await request('/auth/google' + url.search);
    assert.equal(start.status, 302);
    return {
      state: new URL(start.headers.get('location')).searchParams.get('state'),
      ticket: url.search,
    };
  };
  const callback = async (state) =>
    fetch(base + '/auth/google/callback?code=mock&state=' + state, {
      redirect: 'manual',
      headers: { Cookie: 'rigthnder_oauth_state=' + state },
    });
  try {
    const account = await register('existing@example.com');
    const id = account.user.id;
    db.prepare('UPDATE users SET bio=?,photo=? WHERE id=?').run(
      'Keep my biography',
      '/photos/cafe.jpg',
      id,
    );
    assert.equal((await request('/auth/google/link', null, { password })).status, 401);
    assert.equal(
      (await request('/auth/google/link', account.token, { password: 'wrong' })).status,
      401,
    );
    assert.equal(
      (await request('/auth/google/link', account.token, { password, native: true })).status,
      400,
    );
    const before = db.prepare('SELECT count(*) AS n FROM users WHERE seed=0').get().n;
    const first = await begin(account.token);
    assert.equal(
      (await request('/auth/google' + first.ticket)).status,
      400,
      'ticket can be used only once',
    );
    identity = { ...identity, email: 'different@example.com' };
    assert.match(
      decodeURIComponent((await callback(first.state)).headers.get('location')),
      /mismo correo/,
    );
    assert.equal(db.prepare('SELECT google_sub FROM users WHERE id=?').get(id).google_sub, null);
    identity = { ...identity, email: 'existing@example.com', email_verified: false };
    assert.match(
      decodeURIComponent(
        (await callback((await begin(account.token)).state)).headers.get('location'),
      ),
      /No pudimos verificar/,
    );
    identity = { ...identity, email_verified: true };
    const revoked = await begin(account.token);
    await request('/auth/logout', account.token, {});
    assert.match(
      decodeURIComponent((await callback(revoked.state)).headers.get('location')),
      /vinculación expiró/,
    );
    assert.equal(db.prepare('SELECT google_sub FROM users WHERE id=?').get(id).google_sub, null);
    const login = await (
      await request('/auth/login', null, { email: identity.email, password })
    ).json();
    const rival = await register('another@example.com');
    db.prepare('UPDATE users SET google_sub=? WHERE id=?').run(identity.sub, rival.user.id);
    assert.match(
      decodeURIComponent(
        (await callback((await begin(login.token)).state)).headers.get('location'),
      ),
      /otro perfil/,
    );
    db.prepare('UPDATE users SET google_sub=NULL WHERE id=?').run(rival.user.id);
    const linked = await callback((await begin(login.token)).state);
    assert.equal(linked.headers.get('location'), 'http://localhost/?google=linked');
    assert.doesNotMatch(
      linked.headers.get('set-cookie') || '',
      /rigthnder_session=/,
      'linking does not replace the session',
    );
    const me = await (await request('/me', login.token)).json();
    assert.equal(me.id, id);
    assert.equal(me.googleLinked, true);
    assert.equal(me.bio, 'Keep my biography');
    assert.equal(me.photo, '/photos/cafe.jpg');
    assert.equal(db.prepare('SELECT count(*) AS n FROM users WHERE seed=0').get().n, before + 1);
    assert.equal((await request('/auth/google/link', login.token, { password })).status, 409);
    const googleStart = await request('/auth/google');
    const state = new URL(googleStart.headers.get('location')).searchParams.get('state');
    const signedIn = await callback(state);
    assert.equal(signedIn.headers.get('location'), 'http://localhost/?google=ok');
    const cookie = signedIn.headers.get('set-cookie').match(/rigthnder_session=([a-f0-9]+)/)[0];
    const googleMe = await (await fetch(base + '/me', { headers: { Cookie: cookie } })).json();
    assert.equal(googleMe.id, id, 'subsequent Google login uses the same account');
    assert.equal(db.prepare('SELECT count(*) AS n FROM users WHERE seed=0').get().n, before + 1);
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});

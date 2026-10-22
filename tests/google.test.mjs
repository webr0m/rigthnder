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
    const start = await fetch(base, { redirect: 'manual' });
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
    const body = {
      name: 'Google Test',
      birthdate: '2020-01-01',
      gender: 'otro',
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
    assert.equal((await exchange(verifier)).status, 200);
    assert.equal((await exchange(verifier)).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

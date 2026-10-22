import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash, scryptSync } from 'node:crypto';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
import { createRecoveryMailer } from '../server/mail.mjs';

const oldPassword = 'OnlyFachos-old-2026',
  newPassword = 'OnlyFachos-new-2026';
const hash = (value) => createHash('sha256').update(value).digest('hex');
test('mail uses the configured HTTPS origin, private fragment, translations and mandatory TLS', async () => {
  const messages = [];
  let config;
  const mailer = createRecoveryMailer(
    {
      MAIL_TRANSPORT: 'smtp',
      MAIL_FROM: 'admin@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'fixture',
      SMTP_PASS: 'fixture',
      PUBLIC_URL: 'https://onlyfachos.example.com',
      NODE_ENV: 'production',
    },
    (options) => {
      config = options;
      return {
        async sendMail(message) {
          messages.push(message);
        },
      };
    },
  );
  for (const language of ['es', 'en', 'de'])
    await mailer.sendReset({ email: 'person@example.com', token: 'a'.repeat(64), language });
  assert.equal(config.requireTLS, true);
  assert.equal(config.secure, false);
  assert.deepEqual(
    messages.map((m) => m.subject),
    [
      'Recupera tu contraseña de OnlyFachos',
      'Reset your OnlyFachos password',
      'Dein OnlyFachos-Passwort zurücksetzen',
    ],
  );
  for (const message of messages) {
    const link = new URL(message.text.match(/https:\/\/\S+/)[0]);
    assert.equal(link.origin, 'https://onlyfachos.example.com');
    assert.equal(link.search, '');
    assert.equal(new URLSearchParams(link.hash.slice(1)).get('token'), 'a'.repeat(64));
    assert.equal(message.from.address, 'admin@example.com');
    assert.equal(message.disableFileAccess, true);
    assert.ok(!message.text.includes(oldPassword));
  }
});
async function fixture(t, { failure = false, disabled = false } = {}) {
  const db = openDatabase(':memory:'),
    messages = [];
  const password = 'salt:' + scryptSync(oldPassword, 'salt', 64).toString('hex');
  for (const [id, credential, demo] of [
    ['person', password, 0],
    ['google', null, 0],
    ['demo', password, 1],
  ]) {
    db.prepare(
      `INSERT INTO users (id,email,password,name,birthdate,gender,city,demo,consent_at,created_at)
      VALUES (?,?,?,'Test','2000-01-01','otro','Test',?,'now','now')`,
    ).run(id, id + '@example.com', credential, demo);
  }
  const server = createApp(db, {
    demoEnabled: true,
    recoveryMailer: disabled
      ? null
      : {
          async sendReset(message) {
            if (failure) throw Error('SMTP failed');
            messages.push(message);
          },
        },
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  async function request(path, body, token) {
    const res = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, headers: res.headers, data: await res.json() };
  }
  return {
    db,
    request,
    messages,
    forgot: (email = 'person@example.com', language = 'es') =>
      request('/auth/forgot-password', { email, language }),
    reset: (token, password = newPassword) => request('/auth/reset-password', { token, password }),
  };
}

test('recovery hides account existence and type, throttles mail, stores only token digests', async (t) => {
  const f = await fixture(t);
  const known = await f.forgot('PERSON@EXAMPLE.COM', 'de');
  assert.equal(known.status, 202);
  for (const email of [
    'missing@example.com',
    'google@example.com',
    'demo@example.com',
    'person@example.com',
  ]) {
    const result = await f.forgot(email);
    assert.equal(result.status, known.status);
    assert.deepEqual(result.data, known.data);
  }
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].language, 'de');
  const token = f.messages[0].token;
  assert.match(token, /^[a-f0-9]{64}$/);
  const stored = f.db.prepare('SELECT * FROM password_resets').all();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].token_hash, hash(token));
  assert.ok(stored[0].expires_at > Date.now() + 29 * 60000);
  assert.ok(!JSON.stringify(stored).includes(token));
  assert.equal((await f.forgot()).status, 429);
});

test('one-use reset changes the password, revokes all sessions and never signs in automatically', async (t) => {
  const f = await fixture(t);
  const login = () =>
    f.request('/auth/login', { email: 'person@example.com', password: oldPassword });
  const a = await login(),
    b = await login();
  await f.forgot();
  const token = f.messages[0].token;
  // Visiting/scanning a reset page does not redeem the token.
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM password_resets').get().n, 1);
  const reset = await f.reset(token);
  assert.equal(reset.status, 200);
  assert.equal(reset.data.token, undefined);
  assert.match(reset.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  assert.equal((await f.request('/me', undefined, a.data.token)).status, 401);
  assert.equal((await f.request('/me', undefined, b.data.token)).status, 401);
  assert.equal((await login()).status, 401);
  assert.equal(
    (await f.request('/auth/login', { email: 'person@example.com', password: newPassword })).status,
    200,
  );
  assert.equal((await f.reset(token, 'Replay-attempt-2026')).status, 400);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM password_resets').get().n, 0);
});

test('expired, replaced, malformed and weak-password reset attempts leave credentials intact', async (t) => {
  const f = await fixture(t);
  await f.forgot();
  const first = f.messages[0].token;
  assert.equal((await f.reset(first, 'short')).status, 400);
  assert.equal((await f.reset('not-a-token')).status, 400);
  f.db.prepare('UPDATE password_reset_requests SET last_sent_at=?').run(Date.now() - 61000);
  await f.forgot();
  const second = f.messages[1].token;
  assert.notEqual(first, second);
  assert.equal((await f.reset(first)).status, 400);
  f.db.prepare('UPDATE password_resets SET expires_at=?').run(Date.now() - 1);
  assert.equal((await f.reset(second)).status, 400);
  assert.equal(
    (await f.request('/auth/login', { email: 'person@example.com', password: oldPassword })).status,
    200,
  );
});

test('concurrent redemption succeeds exactly once', async (t) => {
  const f = await fixture(t);
  await f.forgot();
  const results = await Promise.all([f.reset(f.messages[0].token), f.reset(f.messages[0].token)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
});

test('mail errors do not disclose accounts and remove undelivered tokens', async (t) => {
  const f = await fixture(t, { failure: true });
  const known = await f.forgot(),
    unknown = await f.forgot('missing@example.com');
  assert.equal(known.status, 202);
  assert.deepEqual(known.data, unknown.data);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM password_resets').get().n, 0);
});

test('recovery reports unavailable without mail configuration', async (t) => {
  const f = await fixture(t, { disabled: true });
  assert.equal((await f.request('/options')).data.passwordRecoveryEnabled, false);
  assert.equal((await f.forgot()).status, 503);
  assert.equal((await f.forgot('missing@example.com')).status, 503);
  assert.equal(createRecoveryMailer({}), null);
  assert.equal(
    createRecoveryMailer({
      MAIL_FROM: 'admin@example.com',
      PUBLIC_URL: 'http://example.com',
      NODE_ENV: 'production',
      MAIL_TRANSPORT: 'sendmail',
    }),
    null,
  );
});

test('tokens are bound to credentials and removed when an account is deleted', async (t) => {
  const f = await fixture(t);
  await f.forgot();
  f.db.prepare('UPDATE users SET password=? WHERE id=?').run('changed-elsewhere', 'person');
  assert.equal((await f.reset(f.messages[0].token)).status, 400);
  f.db.prepare('DELETE FROM users WHERE id=?').run('person');
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM password_resets').get().n, 0);
});

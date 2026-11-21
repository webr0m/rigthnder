import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash, scryptSync } from 'node:crypto';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
import { createRecoveryMailer } from '../server/mail.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const hash = (value) => createHash('sha256').update(value).digest('hex');

test('an intermediate database upgrade preserves legacy access and pending verification across reopens', () => {
  const directory = mkdtempSync(join(tmpdir(), 'onlyfachos-migration-'));
  try {
    const file = join(directory, 'fixture.sqlite');
    let db = openDatabase(file);
    const now = new Date().toISOString();
    for (const id of ['legacy', 'pending'])
      db.prepare(
        `INSERT INTO users
      (id,email,password,name,birthdate,gender,city,consent_at,created_at)
      VALUES (?,?,?,'Fixture','1990-01-01','hombre','Berlin',?,?)`,
      ).run(id, id + '@example.com', 'fixture:hash', now, now);
    db.prepare('INSERT INTO email_verifications VALUES (?,?,?,?,NULL)').run(
      'fixture-token',
      'pending',
      Date.now() + 60000,
      Date.now(),
    );
    db.exec('ALTER TABLE users DROP COLUMN email_verification_required');
    db.close();
    for (let i = 0; i < 2; i++) {
      db = openDatabase(file);
      assert.equal(
        db.prepare("SELECT email_verification_required FROM users WHERE id='legacy'").get()
          .email_verification_required,
        0,
      );
      assert.equal(
        db.prepare("SELECT email_verification_required FROM users WHERE id='pending'").get()
          .email_verification_required,
        1,
      );
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
      assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

async function fixture(t) {
  const db = openDatabase(':memory:'),
    messages = [],
    mailer = {
      async sendVerification(message) {
        messages.push({ type: 'verification', ...message });
      },
      async sendReset(message) {
        messages.push({ type: 'reset', ...message });
      },
    },
    server = createApp(db, { demoEnabled: true, recoveryMailer: mailer }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  async function request(path, body, token) {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, headers: response.headers, data: await response.json() };
  }
  return { db, messages, request };
}

function registration(email = 'person@example.com') {
  return {
    name: 'Person',
    email,
    password: 'OnlyFachos-test-2026',
    birthdate: '1998-04-15',
    gender: 'hombre',
    city: 'Santiago',
    terms: true,
    valuesConsent: true,
    verificationFlow: true,
  };
}

test('enabling verification preserves legacy access without granting an unearned verified badge', async (t) => {
  const f = await fixture(t);
  // A row created by the released schema: it has never gone through the new
  // registration endpoint and its address has not been verified.
  const password = 'fixture:' + scryptSync('OnlyFachos-test-2026', 'fixture', 64).toString('hex');
  f.db
    .prepare(
      `INSERT INTO users
    (id,email,password,name,birthdate,gender,city,consent_at,created_at)
    VALUES ('legacy','legacy@example.com',?,'Legacy','1990-01-01','hombre','Santiago',?,?)`,
    )
    .run(password, new Date().toISOString(), new Date().toISOString());
  const login = await f.request('/auth/login', {
    email: 'legacy@example.com',
    password: 'OnlyFachos-test-2026',
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.emailVerified, false);
});

test('email verification storage is additive and indexed', () => {
  const db = openDatabase(':memory:');
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  assert.equal(userColumns.find((column) => column.name === 'email_verified_at')?.type, 'INTEGER');
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_verifications'")
    .all();
  assert.equal(tables.length, 1);
  const indexes = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'email_verifications_%'",
    )
    .all()
    .map((row) => row.name);
  assert.ok(indexes.includes('email_verifications_user'));
  db.close();
});

test('verification mail uses a private fragment and localized copy', async () => {
  const messages = [];
  const mailer = createRecoveryMailer(
    {
      MAIL_TRANSPORT: 'smtp',
      MAIL_FROM: 'admin@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'fixture',
      SMTP_PASS: 'fixture',
      PUBLIC_URL: 'https://onlyfachos.example.com',
      NODE_ENV: 'production',
    },
    () => ({
      async sendMail(message) {
        messages.push(message);
      },
    }),
  );
  await mailer.sendVerification({
    email: 'person@example.com',
    token: 'b'.repeat(64),
    language: 'es',
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].subject, 'Confirma tu correo de OnlyFachos');
  const link = new URL(messages[0].text.match(/https:\/\/\S+/)[0]);
  assert.equal(link.origin, 'https://onlyfachos.example.com');
  assert.equal(link.pathname, '/verificar-correo');
  assert.equal(link.search, '');
  assert.equal(new URLSearchParams(link.hash.slice(1)).get('token'), 'b'.repeat(64));
  assert.equal(messages[0].from.address, 'admin@example.com');
  assert.equal(messages[0].disableFileAccess, true);
  assert.match(messages[0].text, /24 horas/);
});

test('registration creates an unverified account and does not create a session', async (t) => {
  const f = await fixture(t);
  const result = await f.request('/auth/register', registration());
  assert.equal(result.status, 201);
  assert.equal(result.data.emailVerificationRequired, true);
  assert.equal(result.data.token, undefined);
  assert.equal(result.data.session, undefined);
  const user = f.db
    .prepare('SELECT email_verified_at FROM users WHERE email=?')
    .get('person@example.com');
  assert.equal(user.email_verified_at, null);
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].type, 'verification');
  assert.match(f.messages[0].token, /^[a-f0-9]{64}$/);
  assert.equal(
    f.db.prepare('SELECT token_hash FROM email_verifications').get().token_hash,
    hash(f.messages[0].token),
  );
  assert.ok(
    !JSON.stringify(f.db.prepare('SELECT * FROM email_verifications').all()).includes(
      f.messages[0].token,
    ),
  );
});

test('unverified password login is restricted with a dedicated response', async (t) => {
  const f = await fixture(t);
  await f.request('/auth/register', registration());
  const result = await f.request('/auth/login', {
    email: 'person@example.com',
    password: 'OnlyFachos-test-2026',
  });
  assert.equal(result.status, 403);
  assert.equal(result.data.code, 'EMAIL_VERIFICATION_REQUIRED');
  assert.equal(result.data.token, undefined);
});

test('verification resend does not disclose unknown email addresses', async (t) => {
  const f = await fixture(t);
  await f.request('/auth/register', registration());
  const known = await f.request('/auth/resend-verification', { email: 'person@example.com' });
  const unknown = await f.request('/auth/resend-verification', { email: 'missing@example.com' });
  assert.equal(known.status, 202);
  assert.deepEqual(known.data, unknown.data);
  assert.equal(f.messages.filter((message) => message.type === 'verification').length, 1);
  assert.equal(
    f.db
      .prepare('SELECT count FROM email_verification_requests WHERE email_hash=?')
      .get(hash('missing@example.com')).count,
    1,
  );
});

test('older installed clients receive an actionable activation error instead of a false session', async (t) => {
  const f = await fixture(t),
    body = registration();
  delete body.verificationFlow;
  const created = await f.request('/auth/register', body);
  assert.equal(created.status, 403);
  assert.equal(created.data.code, 'EMAIL_VERIFICATION_REQUIRED');
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
  assert.equal(f.messages.length, 1);
  assert.equal((await f.request('/auth/verify-email', { token: f.messages[0].token })).status, 200);
  assert.equal(
    (await f.request('/auth/login', { email: body.email, password: body.password })).status,
    200,
  );
});

test('pending accounts are absent from both profile feeds', async (t) => {
  const f = await fixture(t);
  await f.request('/auth/register', registration());
  const demo = await f.request('/auth/demo', {});
  for (const path of ['/profiles', '/community/profiles']) {
    const result = await f.request(path, undefined, demo.data.token);
    assert.equal(result.status, 200);
    assert.ok(!JSON.stringify(result.data).includes('Person'));
  }
});

test('resend honors cooldown and daily quotas and resets an expired window', async (t) => {
  const f = await fixture(t);
  await f.request('/auth/register', registration());
  const email = 'person@example.com';
  f.db
    .prepare('UPDATE email_verification_requests SET last_sent_at=?')
    .run(Date.now() - 16 * 60000);
  await f.request('/auth/resend-verification', { email });
  assert.equal(f.messages.length, 2);
  assert.equal(f.db.prepare('SELECT count FROM email_verification_requests').get().count, 2);
  f.db
    .prepare('UPDATE email_verification_requests SET last_sent_at=?,count=5')
    .run(Date.now() - 16 * 60000);
  await f.request('/auth/resend-verification', { email });
  assert.equal(f.messages.length, 2);
  f.db
    .prepare('UPDATE email_verification_requests SET window_start=?')
    .run(Date.now() - 25 * 3600000);
  await f.request('/auth/resend-verification', { email });
  assert.equal(f.messages.length, 3);
  assert.equal(f.db.prepare('SELECT count FROM email_verification_requests').get().count, 1);
});

test('verification token is expiring and one-use, then login succeeds', async (t) => {
  const f = await fixture(t);
  await f.request('/auth/register', registration());
  const token = f.messages[0].token;
  assert.equal((await f.request('/auth/verify-email', { token })).status, 200);
  assert.equal((await f.request('/auth/verify-email', { token })).status, 400);
  assert.ok(
    f.db.prepare('SELECT email_verified_at FROM users WHERE email=?').get('person@example.com')
      .email_verified_at,
  );
  const login = await f.request('/auth/login', {
    email: 'person@example.com',
    password: 'OnlyFachos-test-2026',
  });
  assert.equal(login.status, 200);
  const me = await f.request('/me', undefined, login.data.token);
  assert.equal(me.data.emailVerified, true);
  assert.equal(me.data.emailVerificationToken, undefined);
  await f.request('/auth/register', registration('expired@example.com'));
  const expired = f.messages.find((message) => message.email === 'expired@example.com').token;
  f.db.prepare('UPDATE email_verifications SET expires_at=?').run(Date.now() - 1);
  assert.equal((await f.request('/auth/verify-email', { token: expired })).status, 400);
});

test('password recovery cannot bypass email verification', async (t) => {
  const f = await fixture(t);
  await f.request('/auth/register', registration());
  const reset = await f.request('/auth/forgot-password', {
    email: 'person@example.com',
    language: 'es',
  });
  assert.equal(reset.status, 202);
  const token = f.messages.find((message) => message.type === 'reset').token;
  assert.equal(
    (await f.request('/auth/reset-password', { token, password: 'OnlyFachos-new-2026' })).status,
    200,
  );
  const login = await f.request('/auth/login', {
    email: 'person@example.com',
    password: 'OnlyFachos-new-2026',
  });
  assert.equal(login.status, 403);
  assert.equal(login.data.code, 'EMAIL_VERIFICATION_REQUIRED');
});

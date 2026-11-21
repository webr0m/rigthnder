import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

let db;
let server;
let base;
const origin = 'http://localhost:3000';

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

async function request(path, token, body, method = body ? 'POST' : 'GET', withOrigin = false) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(withOrigin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}

async function account(name) {
  return (
    await request('/auth/register', null, {
      name,
      email: name.toLowerCase() + '@example.com',
      password: 'Moderation-test-2026!',
      birthdate: '1990-03-10',
      gender: 'hombre',
      city: 'Madrid',
      terms: true,
      valuesConsent: true,
    })
  ).data;
}

test('moderation requires role, origin and records report decisions', async () => {
  const operator = await account('Moderator');
  const reporter = await account('Reporter');
  const target = await account('Target');
  db.prepare("UPDATE users SET moderation_role='moderator' WHERE id=?").run(operator.user.id);

  assert.equal((await request('/moderation/reports', reporter.token)).status, 403);
  assert.equal(
    (
      await request('/reports', reporter.token, {
        targetId: target.user.id,
        reason: 'Perfil falso',
        details: 'La cuenta parece duplicada',
      })
    ).status,
    201,
  );

  const listed = await request('/moderation/reports', operator.token);
  assert.equal(listed.status, 200);
  assert.equal(listed.data.reports[0].target.id, target.user.id);
  const reportId = listed.data.reports[0].id;

  assert.equal(
    (
      await request(
        '/moderation/reports/' + reportId,
        operator.token,
        { status: 'reviewing', reason: 'Inicio de revisión' },
        'PATCH',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        '/moderation/reports/' + reportId,
        operator.token,
        { status: 'reviewing', reason: 'Inicio de revisión' },
        'PATCH',
        true,
      )
    ).status,
    200,
  );
  const detail = await request('/moderation/reports/' + reportId, operator.token);
  assert.equal(detail.data.report.status, 'reviewing');
  assert.equal(detail.data.audit.length, 1);
  assert.equal(detail.data.audit[0].toStatus, 'reviewing');
});

test('blocking and restoring a user revoke access and preserve audit history', async () => {
  const operator = await account('Admin');
  const target = await account('Restricted');
  db.prepare("UPDATE users SET moderation_role='admin' WHERE id=?").run(operator.user.id);

  const blocked = await request(
    '/moderation/users/' + target.user.id + '/status',
    operator.token,
    { status: 'blocked', reason: 'Incumplimiento confirmado' },
    'PATCH',
    true,
  );
  assert.equal(blocked.status, 200);
  assert.equal((await request('/me', target.token)).status, 401);

  const auditAfterBlock = await request('/moderation/audit', operator.token);
  assert.ok(auditAfterBlock.data.audit.some((entry) => entry.toStatus === 'blocked'));

  const restored = await request(
    '/moderation/users/' + target.user.id + '/status',
    operator.token,
    { status: 'active', reason: 'Revisión completada' },
    'PATCH',
    true,
  );
  assert.equal(restored.status, 200);
  assert.equal((await request('/me', target.token)).status, 401);
  const auditAfterRestore = await request('/moderation/audit', operator.token);
  assert.ok(auditAfterRestore.data.audit.some((entry) => entry.toStatus === 'active'));
});

test('invalid administrative input returns 400 and moderators cannot sanction peers', async () => {
  const a = await account('PeerOne'),
    b = await account('PeerTwo');
  db.prepare("UPDATE users SET moderation_role='moderator' WHERE id IN (?,?)").run(
    a.user.id,
    b.user.id,
  );
  assert.equal((await request('/moderation/reports?limit=-1', a.token)).status, 400);
  assert.equal((await request('/moderation/audit?limit=invalid', a.token)).status, 400);
  assert.equal(
    (
      await request(
        '/moderation/users/' + b.user.id + '/status',
        a.token,
        { status: 'blocked', reason: 'Revisión por colega' },
        'PATCH',
        true,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        '/moderation/users/' + b.user.id + '/status',
        a.token,
        { status: 'invalid', reason: 'Revisión por colega' },
        'PATCH',
        true,
      )
    ).status,
    400,
  );
  assert.equal((await request('/me', b.token)).status, 200);
});

test('deleting an account removes identifying moderation history', async () => {
  const a = await account('DeleteAudit');
  db.prepare(
    `INSERT INTO moderation_audit VALUES ('delete-test',?,?,'report','user_status','blocked','active',?,'{}',?)`,
  ).run(a.user.id, a.user.id, 'Sensitive details', Date.now());
  assert.equal((await request('/me', a.token, null, 'DELETE')).status, 200);
  const record = db.prepare("SELECT * FROM moderation_audit WHERE id='delete-test'").get();
  assert.equal(record.actor_user_id, '');
  assert.equal(record.target_user_id, '');
  assert.equal(record.report_id, '');
  assert.equal(record.reason, 'Cuenta eliminada.');
});

test('temporary suspensions expire on another user request and are audited only once', async () => {
  const operator = await account('ExpiryAdmin');
  const target = await account('ExpiryTarget');
  db.prepare("UPDATE users SET moderation_role='admin' WHERE id=?").run(operator.user.id);
  assert.equal(
    (
      await request(
        '/moderation/users/' + target.user.id + '/status',
        operator.token,
        { status: 'suspended', reason: 'Revisión temporal', durationHours: 1 },
        'PATCH',
        true,
      )
    ).status,
    200,
  );
  db.prepare('UPDATE users SET moderation_until=? WHERE id=?').run(Date.now() - 1, target.user.id);
  assert.equal((await request('/me', operator.token)).status, 200);
  assert.equal(
    db.prepare('SELECT moderation_status FROM users WHERE id=?').get(target.user.id)
      .moderation_status,
    'active',
  );
  const login = await request('/auth/login', null, {
    email: 'expirytarget@example.com',
    password: 'Moderation-test-2026!',
  });
  assert.equal(login.status, 200);
  const audit = await request('/moderation/audit', operator.token);
  assert.ok(audit.data.audit.some((entry) => entry.action === 'suspension_expired'));
  assert.equal(
    audit.data.audit.filter(
      (entry) => entry.action === 'suspension_expired' && entry.target.id === target.user.id,
    ).length,
    1,
  );
});

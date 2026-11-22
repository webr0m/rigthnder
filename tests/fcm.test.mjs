import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { openDatabase } from '../server/db.mjs';
import { createPushService, fcmFailure } from '../server/push.mjs';

test('FCM configuration failures do not masquerade as expired device tokens', () => {
  assert.equal(fcmFailure({ error: { status: 'NOT_FOUND' } }, 404).statusCode, 503);
  assert.equal(
    fcmFailure({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }, 404).statusCode,
    410,
  );
  assert.equal(fcmFailure({}, 403).code, 'FCM_PERMISSION');
});

test('real HTTP FCM path authenticates, delivers high-priority generic notification and preserves devices on IAM errors', async () => {
  const db = openDatabase(':memory:');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users(id,email,name,birthdate,gender,city,consent_at,created_at)
    VALUES ('qa','qa@example.com','QA','1990-01-01','hombre','Berlin',?,?)`,
  ).run(now, now);
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run('session', 'qa', Date.now() + 60000);
  const device = {
    id: 'device',
    user_id: 'qa',
    session_hash: 'session',
    kind: 'android',
    destination: 'private-fixture-token',
  };
  db.prepare('INSERT INTO push_devices VALUES (?,?,?,?,?,?,?,?)').run(
    'device',
    'qa',
    'session',
    'android',
    device.destination,
    '',
    '',
    Date.now(),
  );
  const private_key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  });
  let status = 200,
    oauthCalls = 0,
    sent;
  const service = createPushService(db, {
    fcm: {
      project_id: 'qa-project',
      client_email: 'qa@qa-project.iam.gserviceaccount.com',
      private_key,
    },
    fetch: async (url, options) => {
      if (url.includes('oauth2.googleapis.com')) {
        oauthCalls++;
        return Response.json({ access_token: 'qa-only', expires_in: 3600 });
      }
      sent = JSON.parse(options.body);
      return Response.json(
        status === 200
          ? { name: 'projects/qa-project/messages/qa' }
          : { error: { status: 'PERMISSION_DENIED' } },
        { status },
      );
    },
  });
  try {
    const result = await service.test(device, 'en');
    assert.equal(result.accepted, true);
    assert.equal(oauthCalls, 1);
    assert.equal(sent.message.android.priority, 'high');
    assert.equal(sent.message.android.notification.channel_id, 'onlyfachos-activity');
    assert.equal(sent.message.data.testId, result.testId);
    assert.equal(sent.message.notification.body, 'OnlyFachos notifications are working.');
    assert.ok(db.prepare('SELECT accepted_at FROM push_delivery_status').get().accepted_at);
    status = 403;
    await assert.rejects(service.test(device, 'en'), (e) => e.status === 503);
    assert.equal(
      db.prepare('SELECT error_code FROM push_delivery_status').get().error_code,
      'FCM_PERMISSION',
    );
    assert.equal(db.prepare('SELECT count(*) AS n FROM push_devices').get().n, 1);
  } finally {
    await service.close();
    db.close();
  }
});

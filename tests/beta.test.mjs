import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
let db, server, base;
before(async () => {
  db = openDatabase(':memory:');
  server = createApp(db, { demoEnabled: true }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise((r) => server.close(r));
  db.close();
});
async function req(path, token, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
async function account(name) {
  return (
    await req('/auth/register', null, {
      name,
      email: name + '@example.com',
      password: 'Beta-test-2026!',
      birthdate: '1996-03-10',
      gender: 'hombre',
      city: 'Madrid',
      terms: true,
      valuesConsent: true,
    })
  ).data;
}
const image =
  'data:image/jpeg;base64,' +
  readFileSync(new URL('../public/photos/cafe.jpg', import.meta.url)).toString('base64');

test('registration retains appearance and language through login and settings updates', async () => {
  const data = {
    name: 'LocaleBeta',
    email: 'locale@example.com',
    password: 'Locale-test-2026!',
    birthdate: '1996-03-10',
    gender: 'hombre',
    city: 'Berlin',
    terms: true,
    valuesConsent: true,
    appearance: 'light',
    language: 'de',
  };
  const created = await req('/auth/register', null, data);
  assert.equal(created.status, 201);
  assert.equal(created.data.user.settings.appearance, 'light');
  assert.equal(created.data.user.settings.language, 'de');
  const login = await req('/auth/login', null, { email: data.email, password: data.password });
  assert.equal(login.data.user.settings.appearance, 'light');
  assert.equal(login.data.user.settings.language, 'de');
  const saved = await req('/me/settings', created.data.token, { language: 'en' }, 'PUT');
  assert.equal(saved.data.settings.language, 'en');
  assert.equal(saved.data.settings.appearance, 'light');
  assert.equal(
    (await req('/me/settings', created.data.token, { language: 'xx' }, 'PUT')).status,
    400,
  );
});

test('privacy settings hide faith and party in every public profile but retain editable own data', async () => {
  const a = await account('PrivacyBetaA'),
    b = await account('PrivacyBetaB');
  await req(
    '/me/community',
    b.token,
    {
      photos: [image, image],
      faith: 'Sí',
      denomination: 'Católica',
      partyStance: 'Milito',
      party: 'Partido de prueba',
      sensitiveConsent: true,
    },
    'PUT',
  );
  const saved = await req('/me/settings', b.token, { hideFaith: true, hideParty: true }, 'PUT');
  assert.equal(saved.data.community.faith, 'Sí');
  const feed = (await req('/community/profiles?gender=todos', a.token)).data;
  const p = feed.profiles.find((p) => p.id === b.user.id);
  assert.equal(p.community.faith, '');
  assert.equal(p.community.party, '');
  assert.equal(p.email, undefined);
  assert.equal(p.settings, undefined);
  const detail = (await req('/people/' + b.user.id, a.token)).data;
  assert.equal(detail.community.denomination, '');
  const me = (await req('/me', b.token)).data;
  assert.equal(me.community.party, 'Partido de prueba');
  assert.equal((await req('/me/settings', b.token, { verified: true }, 'PUT')).status, 400);
});
test('pause removes discovery and new contacts but preserves existing chats; unpause restores discovery', async () => {
  const a = await account('PauseBetaA'),
    b = await account('PauseBetaB'),
    c = await account('PauseBetaC');
  const id = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  await req('/me/settings', b.token, { paused: true }, 'PUT');
  assert.equal((await req('/community/profiles?gender=todos&q=PauseBetaB', c.token)).data.total, 0);
  assert.equal((await req('/conversations', c.token, { targetId: b.user.id })).status, 404);
  assert.equal((await req('/conversations/' + id, a.token)).status, 200);
  assert.equal((await req('/conversations', a.token, { targetId: b.user.id })).status, 201);
  await req('/me/settings', b.token, { paused: false }, 'PUT');
  assert.equal((await req('/community/profiles?gender=todos&q=PauseBetaB', c.token)).data.total, 1);
});
test('unread acknowledges only delivered messages, is private, and archives reactivate on new activity', async () => {
  const a = await account('ReadBetaA'),
    b = await account('ReadBetaB'),
    c = await account('ReadBetaC');
  const id = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  await req('/conversations/' + id + '/messages', a.token, { text: 'Primer mensaje' });
  const detail = (await req('/conversations/' + id, b.token)).data;
  assert.equal(detail.unread, 1);
  assert.equal(
    (await req('/conversations/' + id + '/read', c.token, { through: Date.now() })).status,
    404,
  );
  await req('/conversations/' + id + '/read', b.token, { through: detail.messages[0].createdAt });
  assert.equal((await req('/conversations', b.token)).data[0].unread, 0);
  const old = Date.now() - 15 * 86400000;
  db.prepare('UPDATE messages SET created_at=? WHERE match_id=?').run(old, id);
  assert.equal((await req('/conversations', b.token)).data[0].archived, true);
  await req('/conversations/' + id + '/messages', a.token, { text: 'Volví' });
  assert.equal((await req('/conversations', b.token)).data[0].archived, false);
  assert.equal((await req('/conversations', b.token)).data[0].unread, 1);
});
test('date time and venue require the other participant; rejected changes preserve confirmed plan', async () => {
  const a = await account('PlanBetaA'),
    b = await account('PlanBetaB'),
    c = await account('PlanBetaC');
  const conv = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  const body = {
    day: new Date(Date.now() + 86400000).toISOString(),
    place: 'Cafetería pública, Madrid',
    timezone: 'Europe/Madrid',
  };
  const id = (await req('/conversations/' + conv + '/proposals', a.token, body)).data.id;
  assert.equal((await req('/proposals/' + id + '/answer', a.token, { accept: true })).status, 403);
  assert.equal(
    (await req('/proposals/' + id + '/answer', a.token, { accept: true, demo: true })).status,
    403,
  );
  assert.equal((await req('/proposals/' + id + '/answer', c.token, { accept: true })).status, 404);
  assert.equal((await req('/conversations/' + conv + '/proposals', b.token, body)).status, 409);
  const pendingNotice = (await req('/conversations', b.token)).data.find((c) => c.id === conv);
  assert.equal(pendingNotice.unread, 1);
  assert.match(pendingNotice.lastMessage.text, /Propuesta de cita/);
  const pendingDetail = (await req('/conversations/' + conv, b.token)).data;
  await req('/conversations/' + conv + '/read', b.token, {
    through: pendingDetail.messages.at(-1).createdAt,
  });
  assert.equal((await req('/proposals/' + id + '/answer', b.token, { accept: true })).status, 200);
  const acceptedNotice = (await req('/conversations', a.token)).data.find((c) => c.id === conv);
  assert.equal(acceptedNotice.unread, 1);
  assert.match(acceptedNotice.lastMessage.text, /Día y lugar confirmados/);
  assert.equal((await req('/proposals/' + id + '/answer', b.token, { accept: true })).status, 409);
  const change = (
    await req('/conversations/' + conv + '/proposals', b.token, {
      ...body,
      place: 'Otro lugar público',
    })
  ).data.id;
  await req('/proposals/' + change + '/answer', a.token, { accept: false });
  let plans = (await req('/conversations/' + conv, a.token)).data.proposals;
  assert.equal(plans.find((p) => p.status === 'accepted').id, id);
  const change2 = (
    await req('/conversations/' + conv + '/proposals', a.token, {
      ...body,
      place: 'Nuevo lugar acordado',
    })
  ).data.id;
  await req('/proposals/' + change2 + '/answer', b.token, { accept: true });
  plans = (await req('/conversations/' + conv, a.token)).data.proposals;
  assert.equal(plans.filter((p) => p.status === 'accepted').length, 1);
  assert.equal(plans.find((p) => p.id === id).status, 'superseded');
  assert.equal(
    (
      await req('/conversations/' + conv + '/proposals', a.token, {
        ...body,
        day: '2020-01-01T00:00:00Z',
      })
    ).status,
    400,
  );
});
test('visits are deduplicated, referent filters use actual data and verified filter cannot fabricate users', async () => {
  const a = await account('FilterBetaA'),
    b = await account('FilterBetaB');
  for (const u of [a, b])
    await req(
      '/me/community',
      u.token,
      {
        photos: [image, image],
        artists: ['Artista de prueba'],
        children: 'No',
        debate: 'Una pregunta abierta',
      },
      'PUT',
    );
  assert.equal(
    (
      await req('/community/profiles?gender=todos&shared=true&children=No', a.token)
    ).data.profiles.some((p) => p.id === b.user.id),
    true,
  );
  assert.equal((await req('/community/profiles?verified=true', a.token)).data.total, 0);
  await req('/people/' + b.user.id + '/visit', a.token, {});
  await req('/people/' + b.user.id + '/visit', a.token, {});
  assert.equal((await req('/me/stats', b.token)).data.visits, 1);
});
test('private report details and simultaneous block persist; unblock does not restore deleted messages', async () => {
  const a = await account('ReportBetaA'),
    b = await account('ReportBetaB');
  const id = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  assert.equal(
    (
      await req('/reports', a.token, {
        targetId: b.user.id,
        reason: 'Estafa o solicitud de dinero',
        details: 'Solicitud de transferencia',
        alsoBlock: true,
      })
    ).status,
    201,
  );
  assert.equal((await req('/conversations/' + id, b.token)).status, 404);
  assert.equal((await req('/me/blocked', a.token)).data[0].id, b.user.id);
  assert.equal(
    (await req('/me/export', a.token)).data.reports[0].details,
    'Solicitud de transferencia',
  );
  assert.deepEqual((await req('/me/export', b.token)).data.reports, []);
  await req('/me/blocked/' + b.user.id, a.token, null, 'DELETE');
  assert.equal((await req('/me/blocked', a.token)).data.length, 0);
  assert.equal((await req('/conversations/' + id, a.token)).status, 404);
});

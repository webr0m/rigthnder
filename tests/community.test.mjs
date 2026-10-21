import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
import { streakFor } from '../server/community.mjs';
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
      password: 'Community-test-2026',
      birthdate: '1997-02-12',
      gender: 'otro',
      city: 'Santiago',
      terms: true,
      valuesConsent: true,
    })
  ).data;
}
const image =
  'data:image/jpeg;base64,' +
  readFileSync(new URL('../public/photos/cafe.jpg', import.meta.url)).toString('base64');

test('direct conversation needs no likes, is idempotent, and is private to its participants', async () => {
  const a = await account('DirectA'),
    b = await account('DirectB'),
    c = await account('DirectC');
  const opened = await req('/conversations', a.token, { targetId: b.user.id });
  assert.equal(opened.status, 201);
  const id = opened.data.id;
  assert.equal(db.prepare('SELECT count(*) AS n FROM swipes WHERE user_id=?').get(a.user.id).n, 0);
  assert.equal((await req('/conversations', b.token, { targetId: a.user.id })).data.id, id);
  assert.equal((await req('/conversations/' + id, c.token)).status, 404);
  assert.equal(
    (
      await req('/conversations/' + id + '/messages', a.token, {
        text: 'Hola, conversemos sin un match previo.',
      })
    ).status,
    201,
  );
  assert.equal(
    (await req('/conversations/' + id, b.token)).data.messages[0].text,
    'Hola, conversemos sin un match previo.',
  );
  assert.equal((await req('/conversations', a.token, { targetId: 'demo_lucia' })).status, 404);
});
test('a date needs explicit acceptance from the other participant, cannot be answered twice, and survives reload', async () => {
  const a = await account('DateA'),
    b = await account('DateB'),
    c = await account('DateC');
  const conv = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  const invite = (
    await req('/conversations/' + conv + '/invitations', a.token, { plan: 'Un café' })
  ).data.id;
  assert.equal(
    (await req('/conversations/' + conv + '/invitations', a.token, { plan: 'Una cena' })).status,
    409,
  );
  assert.equal(
    (await req('/invitations/' + invite + '/answer', a.token, { accept: true })).status,
    403,
  );
  assert.equal(
    (await req('/invitations/' + invite + '/answer', c.token, { accept: true })).status,
    404,
  );
  assert.equal(
    (await req('/invitations/' + invite + '/demo-answer', a.token, { accept: true })).status,
    403,
  );
  assert.equal(
    (
      await req(
        '/invitations/' + invite,
        a.token,
        { day: '2026-10-30T18:30', place: 'Café del centro' },
        'PATCH',
      )
    ).status,
    409,
  );
  assert.equal(
    (await req('/invitations/' + invite + '/answer', b.token, { accept: true })).status,
    200,
  );
  assert.equal(
    (await req('/invitations/' + invite + '/answer', b.token, { accept: false })).status,
    409,
  );
  assert.equal(
    (
      await req(
        '/invitations/' + invite,
        a.token,
        { day: '2026-10-30T18:30', place: 'Café del centro' },
        'PATCH',
      )
    ).status,
    409,
  );
  const updated = (await req('/conversations/' + conv, b.token)).data;
  assert.equal(updated.invitations[0].status, 'accepted');
  assert.equal(updated.invitations[0].place, '');
});
test('declining keeps chat available, signals are voluntary, blocking removes invitations and prevents new chat', async () => {
  const a = await account('BlockA'),
    b = await account('BlockB');
  const conv = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  await req('/conversations/' + conv + '/signal', b.token, { plan: 'Un paseo' });
  assert.equal((await req('/conversations/' + conv, a.token)).data.signal.plan, 'Un paseo');
  assert.equal((await req('/conversations/' + conv, b.token)).data.signal, null);
  const id = (await req('/conversations/' + conv + '/invitations', a.token, { plan: 'Un paseo' }))
    .data.id;
  await req('/invitations/' + id + '/answer', b.token, { accept: false });
  assert.equal(
    (await req('/conversations/' + conv + '/messages', a.token, { text: 'Seguimos conversando.' }))
      .status,
    201,
  );
  await req('/blocks', b.token, { targetId: a.user.id });
  assert.equal((await req('/conversations', a.token, { targetId: b.user.id })).status, 404);
  assert.equal((await req('/conversations/' + conv, a.token)).status, 404);
  assert.equal(db.prepare('SELECT count(*) AS n FROM date_invitations WHERE id=?').get(id).n, 0);
});
test('profile consent is explicit, two validated photos are required, clearing optional data persists', async () => {
  const a = await account('ConsentA');
  assert.equal((await req('/me/community', a.token, { photos: [image] }, 'PUT')).status, 400);
  assert.equal(
    (
      await req(
        '/me/community',
        a.token,
        { photos: [image, image], current: 'Libertario', sensitiveConsent: false },
        'PUT',
      )
    ).status,
    400,
  );
  const saved = await req(
    '/me/community',
    a.token,
    {
      photos: [image, image],
      current: 'Libertario',
      faith: 'Sí',
      denomination: 'Católica',
      sensitiveConsent: true,
      authors: ['Hayek'],
    },
    'PUT',
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.data.community.current, 'Libertario');
  const cleared = await req(
    '/me/community',
    a.token,
    { photos: [image, image], sensitiveConsent: false },
    'PUT',
  );
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.community.current, '');
  assert.equal(cleared.data.community.faith, '');
  const exported = (await req('/me/export', a.token)).data;
  assert.equal(exported.profile.community.current, '');
});
test('foreign residence and city persist, and nearby profiles do not mix Chile with abroad', async () => {
  const a = await account('AbroadA'),
    b = await account('AbroadB'),
    c = await account('ChileA');
  for (const [person, region] of [
    [a, 'Fuera de Chile'],
    [b, 'Fuera de Chile'],
    [c, 'Metropolitana'],
  ]) {
    const saved = await req(
      '/me',
      person.token,
      {
        ...person.user,
        city: 'Madrid',
        community: { photos: [image, image], region },
      },
      'PUT',
    );
    assert.equal(saved.status, 200);
  }
  const me = (await req('/me', a.token)).data;
  assert.equal(me.city, 'Madrid');
  assert.equal(me.community.region, 'Fuera de Chile');
  const nearby = (await req('/community/profiles?mode=near', a.token)).data.profiles;
  assert.ok(nearby.some((p) => p.id === b.user.id));
  assert.ok(!nearby.some((p) => p.id === c.user.id));
  const chile = (await req('/community/profiles?mode=near', c.token)).data.profiles;
  assert.ok(!chile.some((p) => [a.user.id, b.user.id].includes(p.id)));
  const everyone = (await req('/community/profiles?city=Madrid', c.token)).data.profiles;
  assert.ok(everyone.some((p) => p.id === a.user.id));
});

test('feed pagination has no overlaps, does not discard chatted profiles, and respects city/shared filters', async () => {
  const a = (await req('/auth/demo', null, {})).data;
  const first = (await req('/community/profiles?limit=2', a.token)).data;
  const next = (await req('/community/profiles?limit=2&offset=' + first.nextOffset, a.token)).data;
  assert.equal(first.profiles.length, 2);
  assert.ok(!first.profiles.some((p) => next.profiles.some((q) => q.id === p.id)));
  const id = first.profiles[0].id;
  await req('/conversations', a.token, { targetId: id });
  assert.ok((await req('/community/profiles', a.token)).data.profiles.some((p) => p.id === id));
  assert.ok(
    (await req('/community/profiles?mode=near', a.token)).data.profiles.every(
      (p) => p.city === 'Santiago',
    ),
  );
  assert.ok(
    (await req('/community/profiles?mode=shared', a.token)).data.profiles.every((p) =>
      p.common.some((v) => /^(Ve |Lee a |Sigue a )/.test(v)),
    ),
  );
  assert.equal((await req('/community/profiles?minAge=90&maxAge=18', a.token)).status, 400);
});
test('community search finds authors, streamers, creators and cities without accents and keeps pagination', async () => {
  const a = (await req('/auth/demo', null, {})).data;
  for (const [q, field] of [
    ['hayek', 'authors'],
    ['mises tv', 'streamers'],
  ]) {
    const found = (await req('/community/profiles?q=' + encodeURIComponent(q), a.token)).data;
    assert.ok(found.profiles.length > 0);
    assert.ok(
      found.profiles.every((p) => p.community[field].some((v) => v.toLowerCase().includes(q))),
    );
  }
  const city = (await req('/community/profiles?q=concepcion', a.token)).data;
  assert.ok(city.profiles.length > 0);
  assert.ok(city.profiles.every((p) => p.city === 'Concepción'));
  const candidate = (await req('/community/profiles', a.token)).data.profiles[0];
  db.prepare('UPDATE users SET community_json=? WHERE id=?').run(
    JSON.stringify({ ...candidate.community, creators: ['Creador Único'] }),
    candidate.id,
  );
  const creators = (await req('/community/profiles?q=creador%20unico', a.token)).data;
  assert.equal(creators.profiles.length, 1);
  assert.equal(creators.profiles[0].id, candidate.id);
  const paged = (await req('/community/profiles?q=hayek&limit=1', a.token)).data;
  assert.equal(paged.profiles.length, 1);
  assert.equal(paged.hasMore, true);
  const next = (
    await req('/community/profiles?q=hayek&limit=1&offset=' + paged.nextOffset, a.token)
  ).data;
  assert.notEqual(paged.profiles[0].id, next.profiles[0].id);
});
test('streak counts consecutive days with messages from both people, not fabricated elapsed days', () => {
  const now = Date.parse('2026-10-16T15:00:00Z'),
    m = [];
  for (const days of [0, 1, 2])
    for (const sender of ['a', 'b'])
      m.push({ sender_id: sender, created_at: now - days * 86400000 });
  assert.equal(streakFor(m, now), 3);
  assert.equal(
    streakFor(
      m.filter((v) => v.sender_id === 'a'),
      now,
    ),
    0,
  );
  assert.equal(
    streakFor(
      m.filter((v) => v.created_at !== now - 86400000),
      now,
    ),
    1,
  );
  assert.equal(streakFor(m, now + 4 * 86400000), 0);
});
test('images, audio and stickers validate payloads; reactions require access and toggle without duplicates', async () => {
  const a = await account('MediaA'),
    b = await account('MediaB'),
    c = await account('MediaC');
  const id = (await req('/conversations', a.token, { targetId: b.user.id })).data.id;
  assert.equal(
    (
      await req('/conversations/' + id + '/messages', a.token, {
        kind: 'image',
        text: 'javascript:alert(1)',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req('/conversations/' + id + '/messages', a.token, {
        kind: 'audio',
        text: 'data:audio/webm;base64,YWJj',
      })
    ).status,
    400,
  );
  assert.equal(
    (await req('/conversations/' + id + '/messages', a.token, { kind: 'sticker', text: 'BASADO' }))
      .status,
    201,
  );
  assert.equal(
    (await req('/conversations/' + id + '/messages', a.token, { kind: 'image', text: image }))
      .status,
    201,
  );
  const msg = (await req('/conversations/' + id, a.token)).data.messages[0];
  assert.equal(
    (
      await req('/conversations/' + id + '/reactions', c.token, {
        messageId: msg.id,
        reaction: '❤️',
      })
    ).status,
    404,
  );
  await req('/conversations/' + id + '/reactions', b.token, { messageId: msg.id, reaction: '❤️' });
  assert.equal((await req('/conversations/' + id, a.token)).data.messages[0].reactions.length, 1);
  await req('/conversations/' + id + '/reactions', b.token, { messageId: msg.id, reaction: '❤️' });
  assert.equal((await req('/conversations/' + id, a.token)).data.messages[0].reactions.length, 0);
});

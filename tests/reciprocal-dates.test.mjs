import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

for (const initiator of ['mujer', 'hombre']) {
  test(`${initiator} can initiate, invite and match; both can counterpropose and confirm`, async (t) => {
    const db = openDatabase(':memory:');
    const server = createApp(db).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(async () => {
      await new Promise((r) => server.close(r));
      db.close();
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function req(path, token, body, method = body ? 'POST' : 'GET') {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, data: await response.json() };
    }
    async function account(gender) {
      const result = await req('/auth/register', null, {
        name: gender,
        email: gender + '@example.com',
        password: 'Reciprocal-test-2026',
        birthdate: '2000-01-01',
        gender,
        city: 'Santiago',
        terms: true,
        valuesConsent: true,
      });
      assert.equal(result.status, 201);
      return result.data;
    }
    const a = await account(initiator),
      b = await account(initiator === 'mujer' ? 'hombre' : 'mujer');
    const unsupported = await req('/auth/register', null, {
      name: 'Test',
      email: 'unsupported@example.com',
      password: 'Reciprocal-test-2026',
      birthdate: '2000-01-01',
      gender: 'otro',
      city: 'Santiago',
      terms: true,
      valuesConsent: true,
    });
    assert.equal(unsupported.status, 400);
    const opened = await req('/conversations', a.token, { targetId: b.user.id });
    assert.equal(opened.status, 201);
    const path = '/conversations/' + opened.data.id;
    // There is no gender role or conversation-age requirement for taking the first step.
    for (const person of [a, b])
      assert.equal((await req(path + '/signal', person.token, { plan: 'Un café' })).status, 201);
    const invitation = await req(path + '/invitations', a.token, { plan: 'Un café' });
    assert.equal(invitation.status, 201);
    assert.equal(
      (await req('/invitations/' + invitation.data.id + '/answer', a.token, { accept: true }))
        .status,
      403,
    );
    assert.equal(
      (await req('/invitations/' + invitation.data.id + '/answer', b.token, { accept: true }))
        .status,
      200,
    );
    for (const person of [a, b])
      assert.equal((await req(path, person.token)).data.invitations[0].status, 'accepted');
    const plan = {
      day: new Date(Date.now() + 3 * 86400000).toISOString(),
      place: 'Café de prueba',
      timezone: 'America/Santiago',
    };
    const proposal = await req(path + '/proposals', b.token, plan);
    assert.equal(proposal.status, 201);
    assert.equal(
      (await req('/proposals/' + proposal.data.id + '/answer', b.token, { accept: true })).status,
      403,
    );
    assert.equal(
      (await req('/proposals/' + proposal.data.id + '/answer', a.token, { accept: false })).status,
      200,
    );
    const counter = await req(path + '/proposals', a.token, { ...plan, place: 'Otro café' });
    assert.equal(counter.status, 201);
    assert.equal(
      (await req('/proposals/' + counter.data.id + '/answer', b.token, { accept: true })).status,
      200,
    );
    for (const person of [a, b]) {
      const shared = (await req(path, person.token)).data.proposals.find(
        (p) => p.status === 'accepted',
      );
      assert.equal(shared.id, counter.data.id);
      assert.equal(shared.place, 'Otro café');
      assert.equal((await req('/me/stats', person.token)).data.dates, 1);
    }
    // Either person may propose a change; it only replaces the confirmed plan after acceptance.
    const change = await req(path + '/proposals', b.token, { ...plan, place: 'Un paseo y café' });
    assert.equal(change.status, 201);
    assert.equal(
      (await req('/proposals/' + change.data.id + '/answer', a.token, { accept: true })).status,
      200,
    );
    const final = (await req(path, a.token)).data.proposals;
    assert.equal(final.find((p) => p.id === counter.data.id).status, 'superseded');
    assert.equal(final.find((p) => p.id === change.data.id).status, 'accepted');
  });
}

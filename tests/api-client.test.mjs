import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api-client.mjs';
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
test('an old unauthorized response cannot expire a newly signed-in account, even during secure storage clearing', async () => {
  let generation = 0,
    expired = 0,
    token = 'old';
  const response = deferred(),
    clear = deferred();
  const api = createApiClient({
    native: true,
    generation: () => generation,
    expired: () => expired++,
    sessions: { getToken: () => token, clear: () => clear.promise },
    fetch: () => response.promise,
  });
  const old = api('/me').catch((e) => e.status);
  response.resolve(Response.json({ error: 'expired' }, { status: 401 }));
  await new Promise((r) => setImmediate(r));
  token = 'new';
  generation++;
  clear.resolve();
  assert.equal(await old, 401);
  assert.equal(expired, 0);
  const lateResponse = deferred();
  const late = createApiClient({
    generation: () => generation,
    expired: () => expired++,
    sessions: { getToken: () => token, clear: () => assert.fail('must not clear new login') },
    fetch: () => lateResponse.promise,
  });
  const pending = late('/me').catch((e) => e.status);
  generation++;
  lateResponse.resolve(new Response('proxy html', { status: 401 }));
  assert.equal(await pending, 401);
  assert.equal(expired, 0);
});
test('current unauthorized sessions expire; invalid JSON, proxy HTML and network failures produce useful errors', async () => {
  let expired = 0;
  const sessions = { getToken: () => '', clear: async () => {} };
  const api = createApiClient({
    sessions,
    expired: () => expired++,
    fetch: async () => new Response('<html>bad gateway</html>', { status: 401 }),
  });
  await assert.rejects(api('/me'), /No pudimos conectar/);
  assert.equal(expired, 1);
  await assert.rejects(api('/auth/google/link'), /No pudimos conectar/);
  assert.equal(expired, 1);
  const invalid = createApiClient({
    sessions,
    fetch: async () => new Response('<html>proxy</html>', { status: 200 }),
  });
  await assert.rejects(invalid('/me'), /No pudimos conectar/);
  const offline = createApiClient({
    sessions,
    fetch: async () => {
      throw TypeError('Failed to fetch');
    },
  });
  await assert.rejects(offline('/me'), /No pudimos conectar/);
});

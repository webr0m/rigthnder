import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
test('malformed and compressed JSON fail safely before authentication; the API stays available', async () => {
  const db = openDatabase(':memory:');
  const app = createApp(db);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const invalid = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: 'El contenido JSON no es válido.' });
    const compressed = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
      body: gzipSync('{}'),
    });
    assert.equal(compressed.status, 415);
    assert.deepEqual(await compressed.json(), { error: 'Envía el contenido JSON sin comprimir.' });
    assert.equal((await fetch(base + '/options')).status, 200);
  } finally {
    await app.locals.push.close();
    await new Promise((r) => server.close(r));
    db.close();
  }
});

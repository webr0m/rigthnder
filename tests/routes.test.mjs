import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

test('known SPA routes work; missing pages and assets return 404 instead of a false success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onlyfachos-routes-'));
  const db = openDatabase(':memory:');
  let server;
  try {
    await writeFile(join(directory, 'index.html'), '<!doctype html><title>OnlyFachos</title>');
    await writeFile(join(directory, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    server = createApp(db, { distDirectory: directory }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const page of ['/', '/app', '/app/', '/demo', '/privacidad', '/recuperar-contrasena']) {
      assert.equal((await fetch(base + page)).status, 200, page);
    }
    for (const missing of ['/no-existe', '/assets/no-existe.js']) {
      assert.equal((await fetch(base + missing)).status, 404, missing);
    }
    const robots = await fetch(base + '/robots.txt');
    assert.match(robots.headers.get('content-type'), /text\/plain/);
    assert.match(await robots.text(), /User-agent/);
    const api = await fetch(base + '/api/no-existe');
    assert.equal(api.status, 404);
    assert.equal((await api.json()).error, 'Ruta no encontrada.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    db.close();
    assert.ok(directory.startsWith(join(tmpdir(), 'onlyfachos-routes-')));
    await rm(directory, { recursive: true, force: true });
  }
});

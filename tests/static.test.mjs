import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

test('production revalidates HTML on root and SPA routes while caching static assets', async () => {
  const dist = mkdtempSync(join(tmpdir(), 'onlyfachos-static-'));
  const html = join(dist, 'index.html'),
    css = join(dist, 'test.css');
  writeFileSync(html, '<!doctype html><title>OnlyFachos</title>');
  writeFileSync(css, 'body { color: black; }');
  const db = openDatabase(':memory:');
  const server = createApp(db, { production: true, distDirectory: dist }).listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ['/', '/index.html', '/privacidad']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      assert.match(await response.text(), /OnlyFachos/);
    }
    const asset = await fetch(base + '/test.css');
    assert.match(asset.headers.get('cache-control'), /max-age=3600/);
    assert.match(await asset.text(), /color: black/);
    writeFileSync(html, '<!doctype html><title>OnlyFachos nueva versión</title>');
    assert.match(await (await fetch(base + '/')).text(), /nueva versión/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    unlinkSync(html);
    unlinkSync(css);
    rmdirSync(dist);
  }
});

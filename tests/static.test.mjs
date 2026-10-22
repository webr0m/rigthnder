import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get } from 'node:http';
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

test('old web host redirects directly to the canonical domain, preserving path and query; legacy API stays usable', async () => {
  const db = openDatabase(':memory:');
  const server = createApp(db, {
    canonicalHost: 'onlyfachos.webrom.lat',
    legacyHost: 'rigthnder.webrom.lat',
  }).listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const requestHost = (path, host) =>
      new Promise((resolve, reject) => {
        get(base + path, { headers: { Host: host } }, (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => (body += chunk));
          response.on('end', () =>
            resolve({ status: response.statusCode, headers: response.headers, body }),
          );
        }).on('error', reject);
      });
    for (const path of ['/', '/privacidad?lang=de', '/terminos']) {
      const response = await requestHost(path, 'rigthnder.webrom.lat');
      assert.equal(response.status, 301);
      assert.equal(response.headers.location, 'https://onlyfachos.webrom.lat' + path);
    }
    const health = await requestHost('/api/health', 'rigthnder.webrom.lat');
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).ok, true);
    const canonical = await requestHost('/api/health', 'onlyfachos.webrom.lat');
    assert.equal(canonical.status, 200);
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});

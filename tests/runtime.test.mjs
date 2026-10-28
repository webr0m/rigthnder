import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('deployable Node bundle starts without node_modules and serves existing auth/database routes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onlyfachos-runtime-'));
  let child;
  try {
    const file = join(directory, 'onlyfachos.cjs');
    await build({
      entryPoints: ['server/index.mjs'],
      bundle: true,
      platform: 'node',
      target: 'node24',
      format: 'cjs',
      outfile: file,
      logLevel: 'silent',
    });
    child = spawn(process.execPath, [file], {
      cwd: directory,
      env: {
        ...process.env,
        PORT: '0',
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        DEMO_ENABLED: 'false',
        DATABASE_PATH: join(directory, 'test.sqlite'),
        FCM_CREDENTIALS_PATH: '',
        WEB_PUSH_PUBLIC_KEY: '',
        WEB_PUSH_PRIVATE_KEY: '',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        MAIL_TRANSPORT: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Bundle did not start')), 10_000);
      child.once('error', reject);
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error('Bundle exited: ' + code));
      });
      child.stdout.on('data', (chunk) => {
        const match = String(chunk).match(/http:\/\/localhost:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve('http://127.0.0.1:' + match[1] + '/api');
        }
      });
    });
    const options = await fetch(url + '/options');
    assert.equal(options.status, 200);
    assert.equal((await options.json()).googleEnabled, false);
    const registration = await fetch(url + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bundle Fixture',
        email: 'bundle@example.com',
        password: 'Bundle-fixture-2026!',
        birthdate: '1995-01-01',
        gender: 'hombre',
        city: 'Berlin',
        terms: true,
        valuesConsent: true,
      }),
    });
    assert.equal(registration.status, 201);
    const data = await registration.json();
    assert.equal(data.user.googleLinked, false);
    const me = await fetch(url + '/me', { headers: { Authorization: 'Bearer ' + data.token } });
    assert.equal((await me.json()).id, data.user.id);
    const push = await (await fetch(url + '/push/config')).json();
    assert.deepEqual(push, { web: false, android: false, publicKey: null });
  } finally {
    if (child && child.exitCode === null) {
      const stopped = once(child, 'exit');
      child.kill();
      await stopped;
    }
    await rm(directory, { recursive: true, force: true });
  }
});

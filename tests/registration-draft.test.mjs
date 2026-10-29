import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createDraftVault } from '../src/registration-draft.mjs';

function fixture() {
  let key,
    time = 1000;
  const rows = new Map();
  const vault = createDraftVault({
    crypto: webcrypto,
    now: () => time,
    keys: {
      read: async () => key,
      write: async (v) => {
        key = v;
      },
      remove: async () => {
        key = null;
      },
    },
    records: {
      read: async (id) => rows.get(id),
      write: async (v) => rows.set(v.id, v),
      remove: async (id) => rows.delete(id),
    },
  });
  return {
    vault,
    rows,
    advance: (ms) => {
      time += ms;
    },
  };
}
test('registration draft survives reload, encrypts photos/identity and expires after inactivity', async () => {
  const f = fixture();
  const draft = {
    identity: { email: 'private@example.com' },
    c: { photos: ['data:image/jpeg;base64,private-photo'] },
    step: 3,
    terms: true,
    rememberMe: false,
  };
  await f.vault.save(draft);
  assert.doesNotMatch(JSON.stringify([...f.rows.values()]), /private|photos|email|terms/);
  assert.deepEqual(await f.vault.load(), draft);
  f.advance(60 * 60_000 + 1);
  assert.equal(await f.vault.load(), null);
  assert.equal(f.rows.size, 0);
});
test('draft tampering is rejected, saves use fresh nonces and cancellation wins queued writes', async () => {
  const f = fixture();
  await f.vault.save({ step: 1 });
  const old = structuredClone([...f.rows.values()][0]);
  await f.vault.save({ step: 1 });
  const next = [...f.rows.values()][0];
  assert.notDeepEqual(next.iv, old.iv);
  next.ciphertext[0] ^= 1;
  assert.equal(await f.vault.load(), null);
  await Promise.all([f.vault.save({ step: 2 }), f.vault.save({ step: 3 }), f.vault.clear()]);
  assert.equal(await f.vault.load(), null);
  assert.equal(f.rows.size, 0);
});

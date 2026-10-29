import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerNativePush } from '../src/push-registration.mjs';
const noop = () => {};
function sdkFixture(register) {
  const listeners = new Map(),
    removed = [];
  return {
    listeners,
    removed,
    sdk: {
      addListener: async (event, handler) => {
        listeners.set(event, handler);
        return {
          remove: async () => {
            removed.push(event);
            listeners.delete(event);
          },
        };
      },
      register: async () => register(listeners),
    },
  };
}
test('cached Android token is caught without startup listeners and success waits for server save', async () => {
  let persisted = false,
    saves = 0;
  const f = sdkFixture((l) => {
    l.get('registration')({ value: 'fixture' });
    l.get('registration')({ value: 'duplicate' });
  });
  await registerNativePush(
    f.sdk,
    async (token) => {
      assert.equal(token, 'fixture');
      saves++;
      await new Promise((r) => setTimeout(r, 5));
      persisted = true;
    },
    noop,
    100,
  );
  assert.equal(persisted, true);
  assert.equal(saves, 1);
  assert.equal(f.removed.length, 2);
});
test('Android registration errors, server rejection and stale accounts reject and clean listeners', async () => {
  const f = sdkFixture((l) => l.get('registrationError')({ error: 'FIS_AUTH_ERROR' }));
  await assert.rejects(registerNativePush(f.sdk, noop, noop, 100), /Firebase/);
  assert.equal(f.removed.length, 2);
  const rejected = sdkFixture((l) => l.get('registration')({ value: 'token' }));
  await assert.rejects(
    registerNativePush(
      rejected.sdk,
      async () => {
        throw Error('Server unavailable');
      },
      noop,
      100,
    ),
    /Server unavailable/,
  );
  let checks = 0,
    saves = 0;
  const stale = sdkFixture((l) => l.get('registration')({ value: 'token' }));
  await assert.rejects(
    registerNativePush(
      stale.sdk,
      async () => {
        saves++;
      },
      () => {
        if (++checks === 3) throw Error('Account changed');
      },
      100,
    ),
    /Account changed/,
  );
  assert.equal(saves, 0);
});
test('stalled SDK calls time out; late listeners are removed without registering', async () => {
  let removed = false,
    registered = false;
  const sdk = {
    addListener: async () => {
      await new Promise((r) => setTimeout(r, 30));
      return {
        remove: async () => {
          removed = true;
        },
      };
    },
    register: async () => {
      registered = true;
    },
  };
  await assert.rejects(registerNativePush(sdk, noop, noop, 5), /no respondió/);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(removed, true);
  assert.equal(registered, false);
  const f = sdkFixture(() => new Promise(() => {}));
  await assert.rejects(registerNativePush(f.sdk, noop, noop, 5), /no respondió/);
  assert.equal(f.removed.length, 2);
});

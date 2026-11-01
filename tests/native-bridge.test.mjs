import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withDeadline } from '../src/deadline.mjs';

test('native cold start, Google proof/draft cleanup and push do not assimilate Capacitor plugin proxies', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onlyfachos-native-'));
  const storage = new Map(),
    marker = new Map(),
    listeners = new Map();
  let thenReads = 0,
    registered = false,
    browserUrl = '';
  const proxy = (methods) =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          // Capacitor generates a wrapper for ANY property, including `then`. An
          // async helper returning the proxy is therefore a never-settling thenable.
          if (name === 'then') {
            thenReads++;
            return () => {};
          }
          return methods[name];
        },
      },
    );
  globalThis.__onlyfachosNativeFixture = {
    storage: proxy({
      get: async (key) => storage.get(key) ?? null,
      set: async (key, value) => {
        storage.set(key, value);
      },
      remove: async (key) => {
        storage.delete(key);
      },
    }),
    push: proxy({
      checkPermissions: async () => ({ receive: 'granted' }),
      requestPermissions: async () => ({ receive: 'granted' }),
      createChannel: async () => {},
      addListener: async (event, handler) => {
        const set = listeners.get(event) || new Set();
        set.add(handler);
        listeners.set(event, set);
        return { remove: async () => set.delete(handler) };
      },
      register: async () => {
        for (const fn of listeners.get('registration') || []) fn({ value: 'native-test-token' });
      },
      unregister: async () => {},
      removeAllDeliveredNotifications: async () => {},
    }),
    device: { notificationStatus: async () => ({ enabled: true, channelBlocked: false }) },
    app: { addListener: async () => ({ remove: async () => {} }), getLaunchUrl: async () => null },
    browser: {
      open: async ({ url }) => {
        browserUrl = url;
      },
      close: async () => {},
    },
    api: async (path, options = {}) => {
      if (path === '/push/config') return { android: true };
      if (path === '/push/devices/current') return { enabled: registered, kind: 'android' };
      if (path === '/push/devices') {
        registered = options.method === 'POST';
        return { ok: true };
      }
      throw Error('Unexpected network request ' + path);
    },
  };
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => marker.get(k) ?? null,
    setItem: (k, v) => marker.set(k, v),
    removeItem: (k) => marker.delete(k),
  };
  const stub = (source) => ({ contents: source, loader: 'js' });
  try {
    const output = join(directory, 'native.mjs');
    await build({
      stdin: {
        contents:
          "export * from './src/mobile.js'; export * from './src/push.js'; export {registrationDrafts} from './src/onboarding-store.js';",
        resolveDir: resolve('.'),
      },
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: output,
      logLevel: 'silent',
      define: { 'import.meta.env': JSON.stringify({ VITE_ADMOB_ENABLED: 'false' }) },
      plugins: [
        {
          name: 'native-fixtures',
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^@capacitor\/(core|app|browser|push-notifications)$|^@aparajita\/capacitor-secure-storage$/,
              },
              (args) => ({ path: args.path, namespace: 'native-fixture' }),
            );
            b.onLoad({ filter: /.*/, namespace: 'native-fixture' }, ({ path }) => {
              if (path === '@capacitor/core')
                return stub(
                  "export const Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android'}; export const registerPlugin=()=>globalThis.__onlyfachosNativeFixture.device;",
                );
              const [name, key] = {
                '@capacitor/app': ['App', 'app'],
                '@capacitor/browser': ['Browser', 'browser'],
                '@capacitor/push-notifications': ['PushNotifications', 'push'],
                '@aparajita/capacitor-secure-storage': ['SecureStorage', 'storage'],
              }[path];
              return stub(`export const ${name}=globalThis.__onlyfachosNativeFixture.${key};`);
            });
            b.onResolve({ filter: /^\.\/api$/ }, () => ({ path: 'api', namespace: 'api-fixture' }));
            b.onLoad({ filter: /.*/, namespace: 'api-fixture' }, () =>
              stub(
                "export const API_URL='https://onlyfachos.example'; export const api=(...args)=>globalThis.__onlyfachosNativeFixture.api(...args);",
              ),
            );
          },
        },
      ],
    });
    const mobile = await import(pathToFileURL(output));
    const within = (work) => withDeadline(work, 1000, 'Native bridge did not settle');
    assert.equal(
      await within(mobile.pendingGoogleRegistration()),
      null,
      'fresh installs must reach the login',
    );
    const pending = {
      ticket: 'fixture-ticket',
      expiresAt: Date.now() + 60000,
      identity: { email: 'fixture@example.com' },
    };
    await within(mobile.rememberGoogleRegistration(pending));
    assert.deepEqual(await within(mobile.pendingGoogleRegistration()), pending);
    await within(mobile.googleLogin(false));
    assert.match(browserUrl, /native=1&challenge=[\w-]{43}&rememberMe=0/);
    await within(mobile.registrationDrafts.clear());
    const stop = await within(mobile.listenPush('fixture-user', () => {}));
    await within(mobile.enablePush('fixture-user'));
    assert.equal((await within(mobile.pushStatus('fixture-user'))).enabled, true);
    await within(mobile.disablePush());
    assert.equal(registered, false);
    stop();
    assert.equal(thenReads, 0, 'no plugin proxy may be returned across an async boundary');
  } finally {
    globalThis.localStorage = previousStorage;
    delete globalThis.__onlyfachosNativeFixture;
    assert.ok(directory.startsWith(join(tmpdir(), 'onlyfachos-native-')));
    await rm(directory, { recursive: true, force: true });
  }
});

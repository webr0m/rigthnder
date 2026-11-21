import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('notification clicks open chats from the promotional page and preserve an existing app', async () => {
  for (const path of ['/', '/app', '/demo', null]) {
    const actions = [],
      listeners = {};
    const client = {
      url: 'https://onlyfachos.example' + path,
      navigate: async (url) => actions.push(['navigate', url]),
      focus: async () => actions.push(['focus']),
      postMessage: (message) => actions.push(['message', message.type]),
    };
    runInNewContext(readFileSync(new URL('../public/push-sw.js', import.meta.url), 'utf8'), {
      URL,
      self: {
        location: { origin: 'https://onlyfachos.example' },
        addEventListener: (name, fn) => (listeners[name] = fn),
        clients: {
          matchAll: async () => (path ? [client] : []),
          openWindow: async (url) => actions.push(['open', url]),
        },
      },
    });
    let pending;
    listeners.notificationclick({
      notification: { close: () => {} },
      waitUntil: (promise) => (pending = promise),
    });
    await pending;
    if (path === '/') assert.deepEqual(actions[0], ['navigate', '/app?open=chats']);
    if (path === '/app')
      assert.deepEqual(actions, [['focus'], ['message', 'onlyfachos:open-chats']]);
    if (path === '/demo' || path === null) assert.deepEqual(actions, [['open', '/app?open=chats']]);
  }
});

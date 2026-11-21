import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDevPorts } from '../scripts/dev.mjs';

test('development launcher keeps the API proxy away from the public web port', () => {
  assert.deepEqual(resolveDevPorts({}), {
    apiPort: 3100,
    proxyUrl: 'http://127.0.0.1:3100',
  });
  assert.deepEqual(resolveDevPorts({ API_PORT: '3210' }), {
    apiPort: 3210,
    proxyUrl: 'http://127.0.0.1:3210',
  });
});

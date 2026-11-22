import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateState } from '../src/update-state.mjs';
test('Play flexible updates distinguish downloaded, in-progress, cancelled and unavailable updates', () => {
  assert.equal(updateState({ status: 11, available: false }), 'ready');
  for (const status of [1, 2, 3]) assert.equal(updateState({ status }), 'downloading');
  for (const status of [4, 6]) assert.equal(updateState({ status, available: true }), 'current');
  assert.equal(updateState({ status: 0, available: true }), 'available');
  assert.equal(updateState({ status: 0, available: false }), 'current');
});

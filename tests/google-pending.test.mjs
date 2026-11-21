import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingGoogleRequest } from '../src/google-pending.mjs';

test('does not request a Google pending registration without a stored ticket', () => {
  assert.equal(pendingGoogleRequest(null), null);
  assert.equal(pendingGoogleRequest({}), null);
});

test('loads a Google pending registration with the stored ticket', () => {
  assert.deepEqual(pendingGoogleRequest({ ticket: 'ticket-value' }), {
    method: 'POST',
    body: { ticket: 'ticket-value' },
  });
});

test('web Google returns and saved drafts use the HttpOnly pending cookie; fresh installs stay quiet', () => {
  assert.deepEqual(pendingGoogleRequest(null, { native: false, returned: true }), {});
  assert.deepEqual(pendingGoogleRequest(null, { native: false, hasDraft: true }), {});
  assert.equal(pendingGoogleRequest(null, { native: true, returned: true }), null);
  assert.equal(pendingGoogleRequest(null, { native: true, hasDraft: true }), null);
});

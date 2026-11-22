import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendChatAttachment, acquireChatMicrophone } from '../src/chat-media.mjs';
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
test('closing a conversation during image/audio preparation prevents sending its late attachment', async () => {
  let current = true;
  const file = deferred(),
    sent = [];
  const operation = sendChatAttachment(
    () => file.promise,
    () => current,
    (value) => sent.push(value),
  );
  current = false;
  file.resolve('private-media');
  await operation;
  assert.deepEqual(sent, []);
  current = true;
  await sendChatAttachment(
    async () => 'current-media',
    () => current,
    (value) => sent.push(value),
  );
  assert.deepEqual(sent, ['current-media']);
});
test('a microphone grant after leaving its chat stops every track instead of starting a recorder', async () => {
  let current = true,
    stopped = 0;
  const permission = deferred();
  const operation = acquireChatMicrophone(
    () => permission.promise,
    () => current,
  );
  current = false;
  permission.resolve({ getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] });
  assert.equal(await operation, null);
  assert.equal(stopped, 2);
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  assert.equal(
    await acquireChatMicrophone(
      async () => stream,
      () => true,
    ),
    stream,
  );
  assert.equal(stopped, 2);
});

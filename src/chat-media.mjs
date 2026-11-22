// A file decode or permission dialog can finish after its conversation closes.
// Keep the send and microphone lifetime bound to the originating conversation.
export async function sendChatAttachment(read, current, send) {
  const content = await read();
  if (current()) await send(content);
}
export async function acquireChatMicrophone(acquire, current) {
  const stream = await acquire();
  if (current()) return stream;
  stream.getTracks().forEach((track) => track.stop());
  return null;
}

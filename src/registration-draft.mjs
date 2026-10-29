// Draft contents are encrypted. The browser keeps the key only in this tab;
// Android stores the short-lived key in Keystore through SecureStorage.
export function createDraftVault({ keys, records, crypto = globalThis.crypto, now = Date.now }) {
  const idle = 60 * 60_000,
    absolute = 24 * idle;
  let queue = Promise.resolve();
  const serial = (fn) => {
    const work = queue.catch(() => {}).then(fn);
    queue = work;
    return work;
  };
  const importKey = (key) =>
    crypto.subtle.importKey('raw', Uint8Array.from(key), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return {
    load: () =>
      serial(async () => {
        const key = await keys.read();
        if (!key) return null;
        const row = await records.read(key.id);
        if (!row || row.expiresAt <= now() || key.createdAt + absolute <= now()) {
          await records.remove(key.id);
          await keys.remove();
          return null;
        }
        try {
          const clear = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: Uint8Array.from(row.iv),
              additionalData: new TextEncoder().encode(key.id),
            },
            await importKey(key.key),
            Uint8Array.from(row.ciphertext),
          );
          return JSON.parse(new TextDecoder().decode(clear));
        } catch {
          await records.remove(key.id);
          await keys.remove();
          return null;
        }
      }),
    save: (value) =>
      serial(async () => {
        let key = await keys.read();
        if (!key || key.createdAt + absolute <= now()) {
          if (key) await records.remove(key.id);
          key = {
            id: crypto.randomUUID(),
            key: Array.from(crypto.getRandomValues(new Uint8Array(32))),
            createdAt: now(),
          };
          await keys.write(key);
        }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key.id) },
          await importKey(key.key),
          new TextEncoder().encode(JSON.stringify(value)),
        );
        await records.write({
          id: key.id,
          expiresAt: Math.min(now() + idle, key.createdAt + absolute),
          iv: Array.from(iv),
          ciphertext: Array.from(new Uint8Array(ciphertext)),
        });
      }),
    clear: () =>
      serial(async () => {
        const key = await keys.read();
        if (key) await records.remove(key.id);
        await keys.remove();
      }),
  };
}

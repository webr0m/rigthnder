// The web uses HttpOnly cookies. Only the native adapter may persist a bearer token.
export function createSessionStore({ native = false, storage, now = Date.now } = {}) {
  let token = '';
  let pending = Promise.resolve();
  const enqueue = (operation) => {
    const result = pending.catch(() => {}).then(operation);
    pending = result;
    return result;
  };
  const valid = (value) =>
    value &&
    /^[a-f0-9]{64}$/.test(value.token || '') &&
    Number.isFinite(value.expiresAt) &&
    value.expiresAt > now();
  return {
    getToken: () => token,
    restore: () =>
      enqueue(async () => {
        if (!native) return;
        token = '';
        const saved = await storage.get();
        if (valid(saved)) token = saved.token;
        else if (saved !== null) await storage.remove();
      }),
    save: (value, { rememberMe = false, expiresAt } = {}) =>
      enqueue(async () => {
        if (!native) return;
        if (rememberMe) {
          if (!valid({ token: value, expiresAt })) throw Error('Invalid saved session');
          await storage.set({ token: value, expiresAt });
        } else await storage.remove();
        token = value || '';
      }),
    clear: (expectedToken) =>
      enqueue(async () => {
        // A late response from an old session must not erase a newer sign-in.
        if (expectedToken !== undefined && token !== expectedToken) return;
        token = '';
        if (native) await storage.remove();
      }),
  };
}

import { Capacitor } from '@capacitor/core';
import { t } from './locale.mjs';
import { createSessionStore } from './session-store.mjs';
import { createApiClient } from './api-client.mjs';
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const native = Capacitor.isNativePlatform();
let sessionGeneration = 0;
const sessionKey = 'onlyfachos-session:' + API_URL;
const secureStorage = async () => import('@aparajita/capacitor-secure-storage');
const sessions = createSessionStore({
  native,
  storage: {
    get: async () => (await secureStorage()).SecureStorage.get(sessionKey, false, false),
    set: async (value) => {
      const { SecureStorage, KeychainAccess } = await secureStorage();
      await SecureStorage.set(
        sessionKey,
        value,
        false,
        false,
        KeychainAccess.whenUnlockedThisDeviceOnly,
      );
    },
    remove: async () => (await secureStorage()).SecureStorage.remove(sessionKey, false),
  },
});
export const restoreToken = () => sessions.restore();
export const setToken = async (token, policy) => {
  sessionGeneration++;
  try {
    if (token) await sessions.save(token, policy);
    else await sessions.clear();
  } catch {
    throw Error(
      t('No pudimos actualizar el acceso guardado de este dispositivo. Inténtalo otra vez.'),
    );
  }
};
export const api = createApiClient({
  baseUrl: API_URL,
  native,
  sessions,
  generation: () => sessionGeneration,
  translate: t,
  expired: () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('onlyfachos:auth-expired'));
  },
});
export async function logoutSession() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (error) {
    // A browser's HttpOnly cookie can only be revoked by the server. Keep the
    // account visible if offline instead of falsely claiming to have logged out.
    if (!native && error.status !== 401)
      throw Error(t('No pudimos cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.'));
  }
  await setToken('');
}

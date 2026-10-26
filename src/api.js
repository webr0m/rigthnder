import { Capacitor } from '@capacitor/core';
import { t } from './locale.mjs';
import { createSessionStore } from './session-store.mjs';
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const native = Capacitor.isNativePlatform();
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
  try {
    if (token) await sessions.save(token, policy);
    else await sessions.clear();
  } catch {
    throw Error(
      t('No pudimos actualizar el acceso guardado de este dispositivo. Inténtalo otra vez.'),
    );
  }
};
export async function api(path, options = {}) {
  const bearer = sessions.getToken();
  const response = await fetch(API_URL + '/api' + path, {
    credentials: native ? 'omit' : 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && bearer && !path.startsWith('/auth/'))
      await sessions.clear(bearer).catch(() => {});
    const error = new Error(t(result.error || 'No pudimos conectar con el servidor.'));
    error.status = response.status;
    throw error;
  }
  return result;
}

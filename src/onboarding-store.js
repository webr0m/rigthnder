import { Capacitor } from '@capacitor/core';
import { createDraftVault } from './registration-draft.mjs';
const keyName = 'onlyfachos-registration-key';
// Return the module, never the Capacitor proxy: its synthetic .then traps
// Promise resolution and leaves await pending forever.
const secure = () => import('@aparajita/capacitor-secure-storage');
async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('onlyfachos-registration', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function record(mode, work) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', mode),
        request = work(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error('No se pudo conservar el formulario.'));
    });
  } finally {
    db.close();
  }
}
export const registrationDrafts = createDraftVault({
  keys: {
    async read() {
      const value = Capacitor.isNativePlatform()
        ? await (await secure()).SecureStorage.get(keyName, false, false)
        : sessionStorage.getItem(keyName);
      return value ? JSON.parse(value) : null;
    },
    async write(value) {
      const text = JSON.stringify(value);
      if (Capacitor.isNativePlatform())
        await (await secure()).SecureStorage.set(keyName, text, false, false);
      else sessionStorage.setItem(keyName, text);
    },
    async remove() {
      if (Capacitor.isNativePlatform()) await (await secure()).SecureStorage.remove(keyName, false);
      else sessionStorage.removeItem(keyName);
    },
  },
  records: {
    read: (id) => record('readonly', (s) => s.get(id)),
    write: (value) => record('readwrite', (s) => s.put(value)),
    remove: (id) => record('readwrite', (s) => s.delete(id)),
  },
});

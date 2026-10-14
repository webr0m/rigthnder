import { Capacitor } from '@capacitor/core';
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let bearer = '';
export const setToken = (token) => {
  bearer = Capacitor.isNativePlatform() ? token : '';
};
export async function api(path, options = {}) {
  const response = await fetch(API_URL + '/api' + path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No pudimos conectar con el servidor.');
  return result;
}

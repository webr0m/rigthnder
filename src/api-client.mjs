import { withDeadline } from './deadline.mjs';
export function createApiClient({
  baseUrl = '',
  native = false,
  sessions,
  generation = () => 0,
  expired = () => {},
  translate = (value) => value,
  fetch: send = globalThis.fetch,
  timeoutMs = 15_000,
}) {
  const failure = () => new Error(translate('No pudimos conectar con el servidor.'));
  return async function api(path, options = {}) {
    const bearer = sessions.getToken(),
      started = generation();
    let response, result;
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener('abort', abort, { once: true });
    try {
      [response, result] = await withDeadline(
        (async () => {
          const response = await send(baseUrl + '/api' + path, {
            credentials: native ? 'omit' : 'include',
            ...options,
            headers: {
              ...(options.body ? { 'Content-Type': 'application/json' } : {}),
              ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
              ...options.headers,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });
          let result;
          try {
            result = await response.json();
          } catch {
            if (response.ok) throw failure();
            result = {};
          }
          return [response, result];
        })(),
        timeoutMs,
        translate(
          'El servidor está tardando demasiado. Comprueba tu conexión y vuelve a intentarlo.',
        ),
        'REQUEST_TIMEOUT',
        () => controller.abort(),
      );
    } catch (error) {
      if (error.code === 'REQUEST_TIMEOUT') throw error;
      throw failure();
    } finally {
      options.signal?.removeEventListener('abort', abort);
    }
    if (started !== generation()) {
      const error = new Error(translate('Tu sesión cambió. Vuelve a intentarlo.'));
      error.code = 'STALE_SESSION';
      throw error;
    }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/') && started === generation()) {
        if (bearer) await sessions.clear(bearer).catch(() => {});
        if (started === generation()) expired();
      }
      const error = new Error(translate(result?.error || 'No pudimos conectar con el servidor.'));
      error.status = response.status;
      if (typeof result?.code === 'string') error.code = result.code;
      throw error;
    }
    return result;
  };
}

export async function revokeSession(request, clear, translate = (value) => value) {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (error) {
    if (error.status !== 401)
      throw Error(
        translate('No pudimos cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.'),
      );
  }
  // Confirm server revocation before claiming logout, including native devices
  // registered for background FCM notifications.
  await clear();
}

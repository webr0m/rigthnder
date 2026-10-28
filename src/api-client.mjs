export function createApiClient({
  baseUrl = '',
  native = false,
  sessions,
  generation = () => 0,
  expired = () => {},
  translate = (value) => value,
  fetch: send = globalThis.fetch,
}) {
  const failure = () => new Error(translate('No pudimos conectar con el servidor.'));
  return async function api(path, options = {}) {
    const bearer = sessions.getToken(),
      started = generation();
    let response;
    try {
      response = await send(baseUrl + '/api' + path, {
        credentials: native ? 'omit' : 'include',
        ...options,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      throw failure();
    }
    let result;
    try {
      result = await response.json();
    } catch {
      if (response.ok) throw failure();
      result = {};
    }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/') && started === generation()) {
        if (bearer) await sessions.clear(bearer).catch(() => {});
        if (started === generation()) expired();
      }
      const error = new Error(translate(result?.error || 'No pudimos conectar con el servidor.'));
      error.status = response.status;
      throw error;
    }
    return result;
  };
}

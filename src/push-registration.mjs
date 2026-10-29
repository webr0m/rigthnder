export function pushFailure(error) {
  const detail = String(error?.error || error?.message || '');
  if (/SERVICE_NOT_AVAILABLE|MISSING_INSTANCEID_SERVICE/i.test(detail))
    return new Error(
      'Google Play Services no pudo registrar las notificaciones. Actualízalo y vuelve a intentarlo.',
    );
  if (/FIS_AUTH_ERROR|AUTHENTICATION_FAILED|API_KEY|INSTALLATIONS/i.test(detail))
    return new Error(
      'Firebase no pudo verificar este dispositivo. Actualiza la app y vuelve a intentarlo.',
    );
  return new Error('No pudimos registrar las notificaciones. Inténtalo otra vez.');
}

export async function boundedPush(work, milliseconds = 20_000) {
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error('El servicio de notificaciones no respondió. Inténtalo de nuevo.')),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Bind before register(): Android can return a cached token immediately. Do not
// depend on an unrelated React startup effect having installed its listeners.
export async function registerNativePush(sdk, save, check, milliseconds = 20_000) {
  const handles = [];
  let closed = false,
    settled = false,
    finish,
    fail;
  const result = new Promise((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  // Attach the rejection handler before awaiting listener installation.
  result.catch(() => {});
  // If the bridge returns a listener after our deadline, remove that late handle
  // too. A stalled native call must not leave the settings button spinning.
  const bind = async (event, callback) => {
    const handle = await sdk.addListener(event, callback);
    if (closed) {
      await handle.remove();
      throw new Error('El registro de notificaciones venció. Inténtalo de nuevo.');
    }
    handles.push(handle);
  };
  try {
    await boundedPush(
      (async () => {
        await bind('registration', async ({ value }) => {
          if (settled || closed) return;
          settled = true;
          try {
            check();
            await save(value);
            check();
            finish();
          } catch (error) {
            fail(error);
          }
        });
        check();
        await bind('registrationError', (error) => {
          if (!settled && !closed) {
            settled = true;
            fail(pushFailure(error));
          }
        });
        check();
        Promise.resolve(sdk.register()).catch(fail);
        return result;
      })(),
      milliseconds,
    );
  } catch (error) {
    fail(error);
    throw error;
  } finally {
    closed = true;
    settled = true;
    await boundedPush(Promise.allSettled(handles.map((handle) => handle.remove())), 2000).catch(
      () => {},
    );
  }
}

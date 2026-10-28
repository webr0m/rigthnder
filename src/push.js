import { Capacitor } from '@capacitor/core';
import { api } from './api';
import { t } from './locale.mjs';
const native = Capacitor.isNativePlatform();
const marker = 'onlyfachos-push-user';
let userEpoch = 0,
  activation = 0;
let handles = [],
  nativeToken,
  activeUser,
  pendingRegistration;
const readMarker = () => {
  try {
    return localStorage.getItem(marker);
  } catch {
    return null;
  }
};
const writeMarker = (value) => {
  try {
    value ? localStorage.setItem(marker, value) : localStorage.removeItem(marker);
  } catch {}
};
const supportedWeb = () =>
  !native &&
  window.isSecureContext &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;
const plugin = async () => (await import('@capacitor/push-notifications')).PushNotifications;
async function webSubscription() {
  return (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
}
async function saveWeb(subscription, accountId) {
  return api('/push/devices', {
    method: 'POST',
    body: { kind: 'web', accountId, ...subscription.toJSON() },
  });
}
export async function pushStatus(userId) {
  const config = await api('/push/config');
  const available = native
    ? Capacitor.getPlatform() === 'android' && config.android
    : supportedWeb() && config.web;
  const permission =
    native && available
      ? (await (await plugin()).checkPermissions()).receive
      : !native && 'Notification' in window
        ? Notification.permission
        : 'default';
  const denied = permission === 'denied';
  return { available, enabled: readMarker() === userId && permission === 'granted', denied };
}
export async function enablePush(userId) {
  const epoch = userEpoch,
    operation = ++activation;
  const check = () => {
    if (activeUser !== userId || userEpoch !== epoch || activation !== operation)
      throw Error(t('La cuenta cambió. Activa las notificaciones de nuevo.'));
  };
  check();
  if (native) {
    if (!(await pushStatus(userId)).available)
      throw Error(t('Las notificaciones aún no están disponibles en este dispositivo.'));
    const sdk = await plugin();
    check();
    const permission = await sdk.requestPermissions();
    check();
    if (permission.receive !== 'granted')
      throw Error(t('Permite las notificaciones en los ajustes del dispositivo.'));
    await sdk.createChannel({
      id: 'onlyfachos-activity',
      name: 'OnlyFachos',
      importance: 3,
      visibility: 0,
    });
    check();
    await new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRegistration = undefined;
        reject(Error(t('No pudimos registrar las notificaciones. Inténtalo otra vez.')));
      }, 20_000);
      pendingRegistration = {
        userId,
        epoch,
        operation,
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      try {
        await sdk.register();
      } catch (error) {
        pendingRegistration = undefined;
        clearTimeout(timer);
        reject(error);
      }
    });
  } else {
    // Called only from the user's enable button, never at startup.
    if (!supportedWeb())
      throw Error(t('Las notificaciones aún no están disponibles en este dispositivo.'));
    if ((await Notification.requestPermission()) !== 'granted')
      throw Error(t('Permite las notificaciones en los ajustes del dispositivo.'));
    const config = await api('/push/config');
    check();
    if (!config.web)
      throw Error(t('Las notificaciones aún no están disponibles en este dispositivo.'));
    const registration = await navigator.serviceWorker.register('/push-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    await navigator.serviceWorker.ready;
    const publicKey = Uint8Array.from(
      atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      }));
    try {
      check();
      await saveWeb(subscription, userId);
    } catch (error) {
      if (activeUser === userId && userEpoch === epoch)
        await subscription.unsubscribe().catch(() => {});
      throw error;
    }
  }
  check();
  writeMarker(userId);
}
export async function disablePush() {
  // Remove server deliveries first; an unsuccessful disable must not claim success.
  await api('/push/devices', { method: 'DELETE' });
  await forgetPush();
}
export async function forgetPush() {
  activation++;
  pendingRegistration?.reject(Error(t('La cuenta cambió. Activa las notificaciones de nuevo.')));
  pendingRegistration = undefined;
  writeMarker('');
  nativeToken = undefined;
  if (native) {
    await (await plugin()).unregister().catch(() => {});
  } else if (supportedWeb()) {
    await (await webSubscription())?.unsubscribe().catch(() => {});
  }
}
export async function listenPush(userId, onOpen) {
  const epoch = ++userEpoch;
  activeUser = userId;
  if (!native) {
    const listener = (event) => {
      if (
        activeUser === userId &&
        userEpoch === epoch &&
        event.data?.type === 'onlyfachos:open-chats'
      )
        onOpen();
    };
    navigator.serviceWorker?.addEventListener('message', listener);
    if (supportedWeb() && readMarker() === userId && Notification.permission === 'granted') {
      const existing = await webSubscription();
      if (existing && userEpoch === epoch && activeUser === userId)
        await saveWeb(existing, userId).catch(() => {});
      else if (userEpoch === epoch && activeUser === userId) writeMarker('');
    }
    return () => {
      if (userEpoch === epoch) {
        userEpoch++;
        activeUser = undefined;
      }
      navigator.serviceWorker?.removeEventListener('message', listener);
    };
  }
  if (Capacitor.getPlatform() !== 'android') return () => {};
  const sdk = await plugin();
  handles = await Promise.all([
    sdk.addListener('registration', async (token) => {
      const pending = pendingRegistration;
      const requested =
        pendingRegistration?.userId === userId &&
        pendingRegistration.epoch === epoch &&
        pendingRegistration.operation === activation;
      if (activeUser !== userId || userEpoch !== epoch || (!requested && readMarker() !== userId))
        return;
      nativeToken = token.value;
      try {
        await api('/push/devices', {
          method: 'POST',
          body: { kind: 'android', accountId: userId, token: nativeToken },
        });
        if (
          requested &&
          pending === pendingRegistration &&
          activeUser === userId &&
          userEpoch === epoch
        )
          pending?.resolve();
      } catch (error) {
        if (pending === pendingRegistration) pending?.reject(error);
      } finally {
        if (pending === pendingRegistration) pendingRegistration = undefined;
      }
    }),
    sdk.addListener('registrationError', () => {
      pendingRegistration?.reject(
        Error(t('No pudimos registrar las notificaciones. Inténtalo otra vez.')),
      );
      pendingRegistration = undefined;
    }),
    sdk.addListener('pushNotificationActionPerformed', () => {
      if (activeUser === userId && userEpoch === epoch) onOpen();
    }),
  ]);
  if (
    readMarker() === userId &&
    (await sdk.checkPermissions()).receive === 'granted' &&
    userEpoch === epoch &&
    activeUser === userId &&
    readMarker() === userId
  )
    await sdk.register();
  const current = handles;
  return () => {
    if (userEpoch === epoch) {
      userEpoch++;
      activeUser = undefined;
    }
    current.forEach((h) => h.remove());
  };
}

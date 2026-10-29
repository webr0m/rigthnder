import { Capacitor } from '@capacitor/core';
import { api } from './api';
import { t } from './locale.mjs';
import { boundedPush, registerNativePush } from './push-registration.mjs';
import { registerPlugin } from '@capacitor/core';
const device = registerPlugin('OnlyFachosDevice');
const native = Capacitor.isNativePlatform();
const marker = 'onlyfachos-push-user';
let userEpoch = 0,
  activation = 0;
let handles = [],
  nativeToken,
  activeUser,
  registering = false;
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
  const registration = await boundedPush(navigator.serviceWorker.getRegistration('/'));
  return registration ? boundedPush(registration.pushManager.getSubscription()) : null;
}
async function saveWeb(subscription, accountId) {
  return api('/push/devices', {
    method: 'POST',
    body: { kind: 'web', accountId, ...subscription.toJSON() },
  });
}
export async function pushStatus(userId) {
  const config = await boundedPush(api('/push/config'));
  const available = native
    ? Capacitor.getPlatform() === 'android' && config.android
    : supportedWeb() && config.web;
  const permission =
    native && available
      ? (await boundedPush((await plugin()).checkPermissions())).receive
      : !native && 'Notification' in window
        ? Notification.permission
        : 'default';
  const system =
    native && available ? await boundedPush(device.notificationStatus()).catch(() => ({})) : {};
  const denied = permission === 'denied' || system.enabled === false || system.channelBlocked;
  const local = native || (supportedWeb() && !!(await webSubscription()));
  const registered =
    available && permission === 'granted' && readMarker() === userId && local
      ? await boundedPush(api('/push/devices/current'))
      : { enabled: false };
  return { available, enabled: !!(registered.enabled && !denied), denied };
}
export async function openPushSettings() {
  if (native && Capacitor.getPlatform() === 'android') await device.openNotificationSettings();
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
    await boundedPush(
      sdk.createChannel({
        id: 'onlyfachos-activity',
        name: 'OnlyFachos',
        importance: 3,
        visibility: 0,
      }),
    );
    check();
    const system = await boundedPush(device.notificationStatus()).catch(() => ({}));
    if (system.enabled === false || system.channelBlocked)
      throw Error(t('Permite las notificaciones en los ajustes del dispositivo.'));
    registering = true;
    try {
      await registerNativePush(
        sdk,
        (token) =>
          boundedPush(
            api('/push/devices', {
              method: 'POST',
              body: { kind: 'android', accountId: userId, token },
            }),
          ),
        check,
      );
    } finally {
      registering = false;
    }
  } else {
    // Called only from the user's enable button, never at startup.
    if (!supportedWeb())
      throw Error(t('Las notificaciones aún no están disponibles en este dispositivo.'));
    if ((await Notification.requestPermission()) !== 'granted')
      throw Error(t('Permite las notificaciones en los ajustes del dispositivo.'));
    const config = await boundedPush(api('/push/config'));
    check();
    if (!config.web)
      throw Error(t('Las notificaciones aún no están disponibles en este dispositivo.'));
    const registration = await boundedPush(
      navigator.serviceWorker.register('/push-sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }),
    );
    await boundedPush(navigator.serviceWorker.ready);
    const publicKey = Uint8Array.from(
      atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const subscription =
      (await boundedPush(registration.pushManager.getSubscription())) ||
      (await boundedPush(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        }),
      ));
    try {
      check();
      await boundedPush(saveWeb(subscription, userId));
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
  await boundedPush(api('/push/devices', { method: 'DELETE' }));
  await forgetPush();
}
export async function forgetPush() {
  activation++;
  writeMarker('');
  nativeToken = undefined;
  if (native) {
    const sdk = await plugin();
    await sdk.unregister().catch(() => {});
    await sdk.removeAllDeliveredNotifications().catch(() => {});
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
      if (registering || activeUser !== userId || userEpoch !== epoch || readMarker() !== userId)
        return;
      nativeToken = token.value;
      try {
        await api('/push/devices', {
          method: 'POST',
          body: { kind: 'android', accountId: userId, token: nativeToken },
        });
      } catch {}
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

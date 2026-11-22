// Bundled ONLY into the disposable CI APK, never into the Play AAB or website.
// Exercise the JS→native permission and registration path under R8 full mode.
import { PushNotifications } from '@capacitor/push-notifications';
import { device } from '../../src/native-device.mjs';
import {
  registerNativePush,
  readPushPermission,
  boundedPush,
} from '../../src/push-registration.mjs';
const status = document.getElementById('status'),
  button = document.getElementById('activate');
const show = (value) => {
  status.textContent = value;
};
const failed = () => show('PUSH_QA_FAILED'); // Never log a token or provider payload.
try {
  const permission = readPushPermission(await boundedPush(PushNotifications.checkPermissions()));
  show('PUSH_QA_READY_' + permission);
  button.disabled = false;
} catch {
  failed();
}
button.onclick = async () => {
  button.disabled = true;
  try {
    const permission = readPushPermission(
      await boundedPush(PushNotifications.requestPermissions(), 90_000),
    );
    if (permission !== 'granted') throw Error('Permission not granted');
    if (readPushPermission(await boundedPush(PushNotifications.checkPermissions())) !== 'granted')
      throw Error('Permission not retained');
    await registerNativePush(
      PushNotifications,
      async (token) => {
        if (typeof token !== 'string' || token.length < 20) throw Error('Missing FCM token');
        // No account, database, remote API, advertising or real users are used.
      },
      () => {},
    );
    await boundedPush(device.clearPushRegistration());
    show('PUSH_QA_REGISTERED_AND_REVOKED');
  } catch {
    failed();
  }
};

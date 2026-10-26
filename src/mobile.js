import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';
import { api, API_URL } from './api';
let verifier = '';
let adsReady = false;
export async function googleLogin(rememberMe = true) {
  const rememberQuery = 'rememberMe=' + (rememberMe ? '1' : '0');
  if (!Capacitor.isNativePlatform()) {
    window.location.assign(API_URL + '/api/auth/google?' + rememberQuery);
    return;
  }
  if (!API_URL.startsWith('https://'))
    throw new Error('Configura VITE_API_URL con la URL HTTPS del backend para Google en móvil.');
  verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  await Browser.open({
    url: API_URL + '/api/auth/google?native=1&challenge=' + challenge + '&' + rememberQuery,
  });
}
export async function listenGoogle(onResult, onError) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = async ({ url }) => {
    if (!url.startsWith('com.rigthnder.app://auth')) return;
    try {
      await Browser.close();
      const params = new URL(url).searchParams;
      if (params.get('error')) throw new Error(params.get('error'));
      if (!verifier)
        throw new Error('Vuelve a pulsar Continuar con Google para completar el acceso.');
      const result = await api('/auth/google/exchange', {
        method: 'POST',
        body: { code: params.get('code'), verifier },
      });
      verifier = '';
      await onResult(result);
    } catch (error) {
      onError(error.message);
    }
  };
  const listener = await App.addListener('appUrlOpen', handle);
  return () => listener.remove();
}
export async function startAds() {
  if (!Capacitor.isNativePlatform())
    throw new Error('AdMob funciona en Android e iOS. Este sitio web no muestra anuncios.');
  if (import.meta.env.VITE_ADMOB_ENABLED !== 'true')
    throw new Error('Activa VITE_ADMOB_ENABLED en la configuración y vuelve a compilar.');
  let consent = await AdMob.requestConsentInfo();
  if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED)
    consent = await AdMob.showConsentForm();
  if (!consent.canRequestAds) throw new Error('No hay permiso para solicitar anuncios.');
  if (!adsReady) {
    await AdMob.initialize();
    adsReady = true;
  }
  const test = import.meta.env.VITE_ADMOB_TEST_MODE !== 'false';
  const ios = Capacitor.getPlatform() === 'ios';
  const adId = test
    ? ios
      ? 'ca-app-pub-3940256099942544/2934735716'
      : 'ca-app-pub-3940256099942544/6300978111'
    : ios
      ? import.meta.env.VITE_ADMOB_IOS_BANNER_ID
      : import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID;
  if (!adId || !/^ca-app-pub-\d+\/\d+$/.test(adId))
    throw new Error('Falta un ID de banner AdMob válido.');
  await AdMob.showBanner({
    adId,
    isTesting: test,
    npa: true,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 82,
  });
  document.body.classList.add('with-ad');
  return test ? 'Banner de prueba activado.' : 'Banner activado.';
}
export async function privacyAds() {
  if (!Capacitor.isNativePlatform())
    throw new Error('No hay cookies publicitarias ni anuncios en la web.');
  if (adsReady) {
    await AdMob.removeBanner();
    document.body.classList.remove('with-ad');
  }
  await AdMob.showPrivacyOptionsForm();
}

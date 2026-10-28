import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { api, API_URL } from './api';
import { createAdsController } from './ads-controller.mjs';
import { adConfig } from './ads-config.mjs';
let verifier = '';
const adsEnabled = import.meta.env.VITE_ADMOB_ENABLED !== 'false';
export const adsAvailable = () => Capacitor.isNativePlatform() && adsEnabled;
const ads = createAdsController({
  load: () => import('@capacitor-community/admob'),
  height(value) {
    const size = Math.min(300, Math.max(0, Math.ceil(value)));
    document.documentElement.style.setProperty('--ad-banner-height', size + 'px');
    document.body.classList.toggle('with-ad', size > 0);
  },
  placement() {
    const { test, bannerId: adId } = adConfig(Capacitor.getPlatform(), import.meta.env);
    const margin =
      Math.ceil(document.querySelector('.bottom-nav')?.getBoundingClientRect().height || 0) + 16;
    return { adId, test, margin, key: [adId, margin, window.innerWidth].join(':') };
  },
});
async function googleChallenge() {
  verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export async function linkGoogle(password) {
  const native = Capacitor.isNativePlatform();
  const challenge = native ? await googleChallenge() : undefined;
  const result = await api('/auth/google/link', {
    method: 'POST',
    body: { password, native, challenge },
  });
  if (native) await Browser.open({ url: result.url });
  else window.location.assign(result.url);
}
export async function googleLogin(rememberMe = true) {
  const rememberQuery = 'rememberMe=' + (rememberMe ? '1' : '0');
  if (!Capacitor.isNativePlatform()) {
    window.location.assign(API_URL + '/api/auth/google?' + rememberQuery);
    return;
  }
  if (!API_URL.startsWith('https://'))
    throw new Error('Configura VITE_API_URL con la URL HTTPS del backend para Google en móvil.');
  const challenge = await googleChallenge();
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
export async function startAds({ silent = false } = {}) {
  if (!adsAvailable()) {
    if (silent) return false;
    throw Error('AdMob funciona en Android e iOS. Este sitio web no muestra anuncios.');
  }
  return ads.start();
}
export async function stopAds() {
  if (adsAvailable()) return ads.stop();
}
export async function privacyAds() {
  if (!adsAvailable()) throw Error('No hay cookies publicitarias ni anuncios en la web.');
  return ads.privacy();
}

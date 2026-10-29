import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { api, API_URL } from './api';
import { createAdsController } from './ads-controller.mjs';
import { adConfig } from './ads-config.mjs';
let verifier = '';
const flowKey = 'onlyfachos-google-flow',
  pendingKey = 'onlyfachos-google-pending';
const secureAuth = async () => (await import('@aparajita/capacitor-secure-storage')).SecureStorage;
async function savedAuth(key) {
  const value = await (await secureAuth()).get(key, false, false);
  if (!value) return null;
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (data.expiresAt <= Date.now()) {
    await (await secureAuth()).remove(key, false);
    return null;
  }
  return data;
}
export async function pendingGoogleRegistration() {
  return Capacitor.isNativePlatform() ? savedAuth(pendingKey) : null;
}
export async function rememberGoogleRegistration(value) {
  if (Capacitor.isNativePlatform())
    await (await secureAuth()).set(pendingKey, JSON.stringify(value), false, false);
}
export async function clearGoogleRegistration() {
  if (Capacitor.isNativePlatform()) await (await secureAuth()).remove(pendingKey, false);
}
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
  await (
    await secureAuth()
  ).set(flowKey, JSON.stringify({ verifier, expiresAt: Date.now() + 15 * 60_000 }), false, false);
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
  const seen = new Set();
  const handle = async ({ url }, initial = false) => {
    if (!url.startsWith('com.rigthnder.app://auth')) return;
    if (seen.has(url)) return;
    seen.add(url);
    try {
      await Browser.close();
      const params = new URL(url).searchParams;
      if (params.get('error')) throw new Error(params.get('error'));
      verifier ||= (await savedAuth(flowKey))?.verifier || '';
      if (!verifier && initial) return;
      if (!verifier)
        throw new Error('Vuelve a pulsar Continuar con Google para completar el acceso.');
      const result = await api('/auth/google/exchange', {
        method: 'POST',
        body: { code: params.get('code'), verifier },
      });
      verifier = '';
      await (await secureAuth()).remove(flowKey, false);
      await onResult(result);
    } catch (error) {
      onError(error.message);
    }
  };
  const listener = await App.addListener('appUrlOpen', handle);
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handle(launch, true);
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adConfig } from '../src/ads-config.mjs';
test('beta defaults use official demo app and banner pairs on both platforms', () => {
  for (const platform of ['android', 'ios']) {
    const config = adConfig(platform);
    assert.equal(config.test, true);
    assert.match(config.appId, /3940256099942544~/);
    assert.match(config.bannerId, /3940256099942544\//);
  }
});
test('real ads require matching non-demo publisher IDs and reject malformed overrides', () => {
  const real = adConfig('android', { VITE_ADMOB_TEST_MODE: 'false' });
  assert.equal(real.test, false);
  assert.match(real.appId, /8258058186888619~/);
  for (const override of [
    { VITE_ADMOB_ANDROID_APP_ID: 'invalid' },
    {
      VITE_ADMOB_ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
      VITE_ADMOB_ANDROID_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
    },
    { VITE_ADMOB_ANDROID_BANNER_ID: 'ca-app-pub-1111111111111111/123' },
  ])
    assert.throws(
      () => adConfig('android', { VITE_ADMOB_TEST_MODE: 'false', ...override }),
      /mismo publicador/,
    );
});

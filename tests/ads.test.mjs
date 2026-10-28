import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdsController } from '../src/ads-controller.mjs';
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function fixture() {
  const calls = [],
    events = {},
    sizes = [];
  let info = {
    canRequestAds: true,
    status: 'NOT_REQUIRED',
    privacyOptionsRequirementStatus: 'NOT_REQUIRED',
  };
  const AdMob = Object.fromEntries(
    ['initialize', 'showBanner', 'removeBanner', 'showPrivacyOptionsForm'].map((k) => [
      k,
      async (value) => {
        calls.push([k, value]);
      },
    ]),
  );
  AdMob.requestConsentInfo = async () => {
    calls.push(['consent']);
    return info;
  };
  AdMob.showConsentForm = async () => ({ canRequestAds: true });
  AdMob.addListener = async (name, fn) => {
    events[name] = fn;
    return { remove: async () => {} };
  };
  const sdk = {
    AdMob,
    AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
    MaxAdContentRating: { Teen: 'Teen' },
    BannerAdSize: { ADAPTIVE_BANNER: 'adaptive' },
    BannerAdPosition: { BOTTOM_CENTER: 'bottom' },
    BannerAdPluginEvents: { SizeChanged: 'size', FailedToLoad: 'failed' },
  };
  const controller = createAdsController({
    load: async () => sdk,
    placement: () => ({ key: 'phone', margin: 94, test: true, adId: 'test-banner' }),
    height: (x) => sizes.push(x),
  });
  return {
    controller,
    AdMob,
    calls,
    events,
    sizes,
    setInfo: (x) => {
      info = x;
    },
  };
}
test('ads wait for consent, initialize once, use NPA and reserve measured height', async () => {
  const f = fixture();
  await f.controller.start();
  await f.controller.start();
  assert.deepEqual(
    f.calls.map((x) => x[0]),
    ['consent', 'initialize', 'showBanner'],
  );
  assert.equal(f.calls[2][1].npa, true);
  assert.equal(f.calls[2][1].margin, 94);
  f.events.size({ height: 92 });
  assert.equal(f.sizes.at(-1), 92);
  await f.controller.stop();
  f.events.size({ height: 60 });
  assert.equal(f.sizes.at(-1), 0);
});
test('denied consent never initializes the ad SDK or requests an ad', async () => {
  const f = fixture();
  f.setInfo({ canRequestAds: false, status: 'REQUIRED', isConsentFormAvailable: false });
  assert.equal(await f.controller.start(), false);
  assert.deepEqual(
    f.calls.map((x) => x[0]),
    ['consent'],
  );
});
test('leaving while consent loads cannot display an ad after logout', async () => {
  const f = fixture(),
    wait = deferred(),
    begun = deferred();
  f.AdMob.requestConsentInfo = async () => {
    begun.resolve();
    return wait.promise;
  };
  const start = f.controller.start();
  await begun.promise;
  const stop = f.controller.stop();
  wait.resolve({ canRequestAds: true });
  assert.equal(await start, false);
  await stop;
  assert.ok(!f.calls.some((x) => ['initialize', 'showBanner'].includes(x[0])));
});
test('a late old load is removed before a new eligible screen can show its ad', async () => {
  const f = fixture(),
    wait = deferred(),
    begun = deferred();
  let shown = 0;
  f.AdMob.showBanner = async () => {
    f.calls.push(['showBanner']);
    if (++shown === 1) {
      begun.resolve();
      await wait.promise;
    }
  };
  const first = f.controller.start();
  await begun.promise;
  const stop = f.controller.stop(),
    second = f.controller.start();
  wait.resolve();
  await Promise.all([first, stop, second]);
  assert.equal(f.calls.at(-1)[0], 'showBanner');
  assert.equal(shown, 2);
});
test('privacy options remove ads and do not silently restart them in settings', async () => {
  const f = fixture();
  await f.controller.start();
  await f.controller.stop();
  f.setInfo({ canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' });
  await f.controller.privacy();
  assert.equal(f.calls.at(-1)[0], 'showPrivacyOptionsForm');
  assert.equal(f.calls.filter((x) => x[0] === 'showBanner').length, 1);
});

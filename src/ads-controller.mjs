// Serialize native calls: a late consent response must never resurrect an ad
// after logout, opening a private screen, or changing privacy choices.
export function createAdsController({ load, placement, height }) {
  let revision = 0,
    desired = false,
    sdk,
    initialized = false,
    listeners;
  let pending = Promise.resolve(),
    starting,
    requested = false,
    currentKey = '',
    visible = false,
    measuredHeight = 0,
    retryAfter = 0,
    consentChecked = false;
  const enqueue = (fn) => {
    const result = pending.catch(() => {}).then(fn);
    pending = result;
    return result;
  };
  const clearLayout = () => {
    requested = false;
    currentKey = '';
    visible = false;
    measuredHeight = 0;
    height(0);
  };
  const remove = async () => {
    clearLayout();
    if (sdk) await sdk.AdMob.removeBanner();
  };
  async function subscribe() {
    if (listeners) return;
    const { AdMob, BannerAdPluginEvents: events } = sdk;
    const handles = [];
    try {
      handles.push(
        await AdMob.addListener(events.SizeChanged, (size) => {
          if (requested) measuredHeight = Math.min(120, Math.max(0, Number(size?.height) || 0));
          if (desired && requested && visible) height(measuredHeight);
        }),
      );
      handles.push(
        await AdMob.addListener(events.FailedToLoad, () => {
          retryAfter = Date.now() + 60_000;
          clearLayout();
          enqueue(remove).catch(() => {});
        }),
      );
      listeners = handles;
    } catch (error) {
      await Promise.allSettled(handles.map((h) => h.remove()));
      throw error;
    }
  }
  return {
    start() {
      desired = true;
      if (starting) return starting;
      const id = ++revision;
      const valid = () => desired && id === revision;
      const result = enqueue(async () => {
        if (!valid()) return false;
        const config = placement();
        if (requested && currentKey === config.key) {
          if (!visible) {
            await sdk.AdMob.resumeBanner();
            if (!valid()) {
              await sdk.AdMob.hideBanner();
              return false;
            }
            visible = true;
            height(measuredHeight);
          }
          return true;
        }
        if (Date.now() < retryAfter) return false;
        sdk ??= await load();
        if (!valid()) return false;
        const { AdMob, AdmobConsentStatus, MaxAdContentRating, BannerAdSize, BannerAdPosition } =
          sdk;
        // Remove the old ad before refreshing consent or rotating the layout.
        if (requested) await remove();
        if (!consentChecked) {
          let consent = await AdMob.requestConsentInfo();
          if (!valid()) return false;
          if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable)
            consent = await AdMob.showConsentForm();
          if (!valid()) return false;
          if (!consent.canRequestAds) {
            clearLayout();
            return false;
          }
          consentChecked = true;
        }
        if (!initialized) {
          await AdMob.initialize({ maxAdContentRating: MaxAdContentRating.Teen });
          initialized = true;
        }
        if (!valid()) return false;
        await subscribe();
        if (!valid()) return false;
        requested = true;
        visible = true;
        currentKey = config.key;
        try {
          await AdMob.showBanner({
            adId: config.adId,
            isTesting: config.test,
            npa: true,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: config.margin,
          });
        } catch (error) {
          retryAfter = Date.now() + 60_000;
          clearLayout();
          throw error;
        }
        if (!valid()) {
          await remove();
          return false;
        }
        return true;
      });
      starting = result;
      result
        .finally(() => {
          if (starting === result) starting = undefined;
        })
        .catch(() => {});
      return result;
    },
    pause() {
      desired = false;
      revision++;
      starting = undefined;
      visible = false;
      height(0);
      return enqueue(async () => {
        if (requested) await sdk.AdMob.hideBanner();
      });
    },
    stop() {
      desired = false;
      revision++;
      starting = undefined;
      clearLayout();
      return enqueue(remove);
    },
    privacy() {
      consentChecked = false;
      revision++;
      starting = undefined;
      clearLayout();
      return enqueue(async () => {
        sdk ??= await load();
        await remove();
        const info = await sdk.AdMob.requestConsentInfo();
        if (info.privacyOptionsRequirementStatus === 'REQUIRED') {
          await sdk.AdMob.showPrivacyOptionsForm();
          return true;
        }
        if (info.status === sdk.AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
          await sdk.AdMob.showConsentForm();
          return true;
        }
        return false;
      });
    },
  };
}

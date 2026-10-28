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
    currentKey = '';
  const enqueue = (fn) => {
    const result = pending.catch(() => {}).then(fn);
    pending = result;
    return result;
  };
  const clearLayout = () => {
    requested = false;
    currentKey = '';
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
          if (desired && requested) height(Math.max(0, Number(size?.height) || 0));
        }),
      );
      handles.push(
        await AdMob.addListener(events.FailedToLoad, () => {
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
        if (requested && currentKey === config.key) return true;
        sdk ??= await load();
        if (!valid()) return false;
        const { AdMob, AdmobConsentStatus, MaxAdContentRating, BannerAdSize, BannerAdPosition } =
          sdk;
        // Remove the old ad before refreshing consent or rotating the layout.
        if (requested) await remove();
        let consent = await AdMob.requestConsentInfo();
        if (!valid()) return false;
        if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable)
          consent = await AdMob.showConsentForm();
        if (!valid()) return false;
        if (!consent.canRequestAds) {
          clearLayout();
          return false;
        }
        if (!initialized) {
          await AdMob.initialize({ maxAdContentRating: MaxAdContentRating.Teen });
          initialized = true;
        }
        if (!valid()) return false;
        await subscribe();
        if (!valid()) return false;
        requested = true;
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
    stop() {
      desired = false;
      revision++;
      starting = undefined;
      clearLayout();
      return enqueue(remove);
    },
    privacy() {
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

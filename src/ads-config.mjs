import owned from '../mobile-ads.json' with { type: 'json' };
export function adConfig(platform, env = {}) {
  if (!['android', 'ios'].includes(platform)) throw Error('Plataforma de anuncios no válida.');
  const test = env.VITE_ADMOB_TEST_MODE !== 'false',
    prefix = 'VITE_ADMOB_' + platform.toUpperCase();
  const config = test
    ? {
        appId:
          platform === 'ios'
            ? 'ca-app-pub-3940256099942544~1458002511'
            : 'ca-app-pub-3940256099942544~3347511713',
        bannerId:
          platform === 'ios'
            ? 'ca-app-pub-3940256099942544/2934735716'
            : 'ca-app-pub-3940256099942544/6300978111',
      }
    : {
        appId: env[prefix + '_APP_ID']?.trim() || owned[platform].appId,
        bannerId: env[prefix + '_BANNER_ID']?.trim() || owned[platform].bannerId,
      };
  const app = /^ca-app-pub-(\d{16})~\d+$/.exec(config.appId || ''),
    banner = /^ca-app-pub-(\d{16})\/\d+$/.exec(config.bannerId || '');
  if (!app || !banner || app[1] !== banner[1] || (!test && app[1] === '3940256099942544'))
    throw Error(
      'Configura App ID y banner AdMob válidos del mismo publicador. Los IDs de Google solo se permiten en modo prueba.',
    );
  return { ...config, test };
}

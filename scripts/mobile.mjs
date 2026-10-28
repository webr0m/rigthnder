import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { adConfig } from '../src/ads-config.mjs';
try {
  process.loadEnvFile('.env');
} catch {}
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform))
  throw Error('Usa node scripts/mobile.mjs android o ios');
const adsEnabled = process.env.VITE_ADMOB_ENABLED !== 'false';
const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
const ads = adConfig(platform, process.env);
const includePush = platform === 'android' && existsSync('android/app/google-services.json');
if (includePush) {
  const firebase = JSON.parse(readFileSync('android/app/google-services.json', 'utf8'));
  if (
    !firebase.client.some(
      (client) => client.client_info.android_client_info.package_name === config.appId,
    )
  )
    throw Error('La configuración Firebase no coincide con el paquete Android.');
}
config[platform] = {
  ...config[platform],
  includePlugins: [
    '@capacitor/app',
    '@capacitor/browser',
    '@aparajita/capacitor-secure-storage',
    ...(adsEnabled ? ['@capacitor-community/admob'] : []),
    ...(includePush ? ['@capacitor/push-notifications'] : []),
  ],
};
writeFileSync('capacitor.config.json', JSON.stringify(config, null, 2) + '\n');
const cap = resolve('node_modules/@capacitor/cli/bin/capacitor');
function run(args) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_ADMOB_ENABLED: String(adsEnabled),
      VITE_ADMOB_TEST_MODE: String(ads.test),
      ...(process.env.VITE_API_URL ? {} : { VITE_API_URL: 'https://onlyfachos.webrom.cc' }),
    },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
run([resolve('node_modules/vite/bin/vite.js'), 'build']);
if (!existsSync(platform)) run([cap, 'add', platform]);
if (platform === 'android') {
  const file = 'android/app/src/main/AndroidManifest.xml';
  let xml = readFileSync(file, 'utf8');
  for (const [name, value] of [
    ['firebase_messaging_auto_init_enabled', 'false'],
    ['firebase_analytics_collection_enabled', 'false'],
  ]) {
    if (!xml.includes('android:name="' + name + '"'))
      xml = xml.replace(
        '</application>',
        '    <meta-data android:name="' +
          name +
          '" android:value="' +
          value +
          '" />\n    </application>',
      );
  }
  if (!xml.includes('com.rigthnder.app" android:host="auth'))
    xml = xml.replace(
      '</activity>',
      '<intent-filter><action android:name="android.intent.action.VIEW" /><category android:name="android.intent.category.DEFAULT" /><category android:name="android.intent.category.BROWSABLE" /><data android:scheme="com.rigthnder.app" android:host="auth" /></intent-filter></activity>',
    );
  xml = xml.replace(
    /\s*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/g,
    '',
  );
  if (adsEnabled)
    xml = xml.replace(
      '</application>',
      '    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />\n    </application>',
    );
  writeFileSync(file, xml);
  const stringsFile = 'android/app/src/main/res/values/strings.xml';
  let strings = readFileSync(stringsFile, 'utf8');
  strings = strings.replace(/\s*<string name="admob_app_id">[^<]*<\/string>/g, '');
  if (adsEnabled)
    strings = strings.replace(
      '</resources>',
      '    <string name="admob_app_id">' + ads.appId + '</string>\n</resources>',
    );
  writeFileSync(stringsFile, strings);
} else {
  const file = 'ios/App/App/Info.plist';
  let xml = readFileSync(file, 'utf8');
  xml = xml
    .replace(/\s*<key>GADIsAdManagerApp<\/key>\s*<true\/>/g, '')
    .replace(/\s*<key>GADApplicationIdentifier<\/key>\s*<string>[^<]*<\/string>/g, '');
  if (adsEnabled) {
    xml = xml.replace(
      '</dict>\n</plist>',
      '    <key>GADApplicationIdentifier</key><string>' +
        ads.appId +
        '</string>\n</dict>\n</plist>',
    );
    if (!xml.includes('<key>SKAdNetworkItems</key>'))
      xml = xml.replace(
        '</dict>\n</plist>',
        '<key>SKAdNetworkItems</key><array><dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict></array>\n</dict>\n</plist>',
      );
  }
  if (!xml.includes('CFBundleURLTypes'))
    xml = xml.replace(
      '</dict>\n</plist>',
      '<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>com.rigthnder.app</string></array></dict></array>\n</dict>\n</plist>',
    );
  writeFileSync(file, xml);
}
run([cap, 'sync', platform]);
console.log(
  'OnlyFachos ' +
    platform +
    ': AdMob ' +
    (adsEnabled ? (ads.test ? 'de prueba' : 'real') : 'desactivado') +
    '; push ' +
    (includePush ? 'FCM Android preparado' : 'requiere configuración de la plataforma') +
    '.',
);

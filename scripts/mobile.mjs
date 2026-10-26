import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform))
  throw new Error('Usa node scripts/mobile.mjs android o ios');
const cap = resolve('node_modules/@capacitor/cli/bin/capacitor');
const adsEnabled = process.env.VITE_ADMOB_ENABLED === 'true';
if (platform === 'android') {
  // Exclude the native advertising SDK from builds that do not request ads.
  const configFile = 'capacitor.config.json';
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  config.android = {
    ...config.android,
    includePlugins: [
      '@capacitor/app',
      '@capacitor/browser',
      '@aparajita/capacitor-secure-storage',
      ...(adsEnabled ? ['@capacitor-community/admob'] : []),
    ],
  };
  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
}
function run(args) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: process.env.VITE_API_URL || 'https://onlyfachos.webrom.cc',
    },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
run([resolve('node_modules/vite/bin/vite.js'), 'build']);
if (!existsSync(platform)) run([cap, 'add', platform]);
if (platform === 'android') {
  const file = 'android/app/src/main/AndroidManifest.xml';
  let xml = readFileSync(file, 'utf8');
  if (!xml.includes('com.rigthnder.app" android:host="auth'))
    xml = xml.replace(
      '</activity>',
      `<intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.rigthnder.app" android:host="auth" />
            </intent-filter>
        </activity>`,
    );
  if (!adsEnabled)
    xml = xml.replace(
      /\s*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/g,
      '',
    );
  if (adsEnabled && !xml.includes('com.google.android.gms.ads.APPLICATION_ID'))
    xml = xml.replace(
      '</application>',
      '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3940256099942544~3347511713" />\n    </application>',
    );
  writeFileSync(file, xml);
} else {
  const file = 'ios/App/App/Info.plist';
  let xml = readFileSync(file, 'utf8');
  if (!xml.includes('GADApplicationIdentifier'))
    xml = xml.replace(
      '</dict>\n</plist>',
      `<key>GADApplicationIdentifier</key>
    <string>ca-app-pub-3940256099942544~1458002511</string>
    <key>CFBundleURLTypes</key>
    <array><dict><key>CFBundleURLSchemes</key><array><string>com.rigthnder.app</string></array></dict></array>
</dict>
</plist>`,
    );
  writeFileSync(file, xml);
}
run([cap, 'sync', platform]);
console.log(
  platform === 'ios'
    ? 'Proyecto iOS preparado. Compila y prueba en un Mac con Xcode.'
    : 'Proyecto Android preparado. Ábrelo con Android Studio para compilar y probar.',
);

import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
const icon = await readFile('public/icon.svg');
await mkdir('public/icons', { recursive: true });
for (const size of [192, 512])
  await sharp(icon).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(icon)
  .resize(1024, 1024)
  .flatten({ background: '#0d0d11' })
  .png()
  .toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
for (const [density, size] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
})) {
  const directory = `android/app/src/main/res/mipmap-${density}`;
  for (const name of ['ic_launcher', 'ic_launcher_round'])
    await sharp(icon).resize(size, size).png().toFile(`${directory}/${name}.png`);
}
await writeFile(
  'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512">
<path android:fillColor="#FFDA00" android:pathData="M124,100 L418,100 L386,412 L92,412 Z"/>
<path android:fillColor="#0D0D11" android:pathData="M185,149 L342,149 L336,195 L237,195 L230,244 L317,244 L310,290 L223,290 L212,366 L155,366 Z"/>
</vector>`,
);
await writeFile(
  'android/app/src/main/res/values/ic_launcher_background.xml',
  '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#0d0d11</color></resources>',
);
await writeFile(
  'android/app/src/main/res/drawable/ic_launcher_background.xml',
  '<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#0d0d11"/></shape>',
);
const mark = await sharp(icon).resize(310, 310).png().toBuffer();
const splash = await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: '#0d0d11' },
})
  .composite([{ input: mark, gravity: 'centre' }])
  .png()
  .toBuffer();
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  await writeFile(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, splash);
for (const dir of await readdir('android/app/src/main/res')) {
  if (!dir.startsWith('drawable')) continue;
  const file = `android/app/src/main/res/${dir}/splash.png`;
  try {
    const previous = await readFile(file);
    const meta = await sharp(previous).metadata();
    await writeFile(
      file,
      await sharp(splash).resize(meta.width, meta.height, { fit: 'cover' }).png().toBuffer(),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
console.log('Iconos OnlyFachos creados para web, Android e iOS.');

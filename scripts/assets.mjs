// Recursos de muestra. No usar estas fotos como identidades de usuarios reales.
import { mkdir, writeFile } from 'node:fs/promises';
const photos = {
  lucia: 'photo-1534528741775-53994a69daeb',
  martin: 'photo-1500648767791-00dcc994a43e',
  valentina: 'photo-1524504388940-b1c1722653e1',
  tomas: 'photo-1506794778202-cad84cf45f1d',
  antonella: 'photo-1524250502761-1ac6f2e30d43',
  nicolas: 'photo-1519085360753-af0119f7cbe7',
  cafe: 'photo-1442512595331-e89e73853f31',
  coast: 'photo-1476514525535-07fb3b4ae5f1',
};
await mkdir('public/photos', { recursive: true });
await mkdir('public/fonts', { recursive: true });
await Promise.all(
  Object.entries(photos).map(async ([name, id]) => {
    const response = await fetch(
      `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`,
    );
    if (!response.ok) throw new Error(`No se pudo descargar ${name}: ${response.status}`);
    await writeFile(`public/photos/${name}.jpg`, Buffer.from(await response.arrayBuffer()));
    console.log(`Foto lista: ${name}`);
  }),
);
const css = await (
  await fetch('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
).text();
const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)];
if (!urls.length) throw new Error('No se pudo obtener Manrope');
const font = await fetch(urls.at(-1)[1]);
await writeFile('public/fonts/manrope.woff2', Buffer.from(await font.arrayBuffer()));
const license = await fetch(
  'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt',
);
await writeFile('public/fonts/OFL.txt', await license.text());
console.log('Tipografía local lista: Manrope');

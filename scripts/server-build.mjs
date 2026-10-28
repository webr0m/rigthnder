import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('server-build', { recursive: true });
const result = await build({
  entryPoints: ['server/index.mjs'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outfile: 'server-build/onlyfachos.cjs',
  metafile: true,
  legalComments: 'eof',
  logLevel: 'warning',
});
writeFileSync(
  'server-build/dependencies.json',
  JSON.stringify({ inputs: Object.keys(result.metafile.inputs) }, null, 2) + '\n',
);
console.log('Servidor Node compilado con sus dependencias; no contiene variables de entorno.');

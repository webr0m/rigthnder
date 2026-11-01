import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const output = resolve('.deploy', 'rigthnder-' + new Date().toISOString().replace(/[:.]/g, '-'));
function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
run([resolve('node_modules/vite/bin/vite.js'), 'build']);
run([resolve('scripts/server-build.mjs')]);
await mkdir(output, { recursive: true });
for (const item of ['server', 'server-build', 'dist', 'app.cjs', 'LICENSE'])
  await cp(resolve(item), resolve(output, item), { recursive: true });
await mkdir(resolve(output, 'scripts'), { recursive: true });
await cp(resolve('scripts/moderation.mjs'), resolve(output, 'scripts/moderation.mjs'));
const original = JSON.parse(await readFile('package.json', 'utf8'));
const runtime = {
  name: 'rigthnder-server',
  version: original.version,
  private: true,
  type: 'module',
  engines: original.engines,
  scripts: { start: 'node --env-file-if-exists=.env server/index.mjs' },
  dependencies: {},
};
for (const key of [
  'express',
  'cors',
  'helmet',
  'express-rate-limit',
  'zod',
  'nodemailer',
  'web-push',
])
  runtime.dependencies[key] = original.dependencies[key];
await writeFile(resolve(output, 'package.json'), JSON.stringify(runtime, null, 2) + '\n');
await writeFile(
  resolve(output, '.env.example'),
  `NODE_ENV=production
DEMO_ENABLED=true
DATABASE_PATH=/home/jyscqqde/rigthnder-data/rigthnder.sqlite
PUBLIC_URL=https://onlyfachos.webrom.cc
ALLOWED_ORIGINS=https://onlyfachos.webrom.cc,https://rigthnder.webrom.lat,https://localhost,capacitor://localhost
TRUST_PROXY=1
MAIL_TRANSPORT=
MAIL_FROM=
SENDMAIL_PATH=/usr/sbin/sendmail
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://onlyfachos.webrom.cc/api/auth/google/callback
CANONICAL_HOST=onlyfachos.webrom.cc
LEGACY_HOST=rigthnder.webrom.lat
`,
);
await writeFile(
  resolve(output, 'DEPLOYMENT.txt'),
  `OnlyFachos ${runtime.version} · Namecheap/cPanel\n\n` +
    `This archive contains application files only. It deliberately does not include the live .env or SQLite database.\n` +
    `For an upgrade, back up the current app and database, replace server/, server-build/, dist/, app.cjs, package.json and scripts/moderation.mjs, preserve .env and the database, run npm install, then restart the existing Passenger app.\n` +
    `Do not upload .env.example over the live .env. It is only a reference for a fresh installation.\n`,
);
console.log(output);

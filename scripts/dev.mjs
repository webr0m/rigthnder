import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const children = [
  spawn(process.execPath, ['--watch', '--env-file-if-exists=.env', 'server/index.mjs'], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js')], { stdio: 'inherit' }),
];
function close(code = 0) {
  children.forEach((child) => child.kill());
  process.exit(code);
}
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());
children.forEach((child) => child.on('exit', (code) => close(code ?? 0)));

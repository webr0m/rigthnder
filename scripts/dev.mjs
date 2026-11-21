import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function resolveDevPorts(env = process.env) {
  const apiPort = Number(env.API_PORT || 3100);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535)
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  return {
    apiPort,
    proxyUrl: env.API_PROXY_URL || `http://127.0.0.1:${apiPort}`,
  };
}

function start() {
  const { apiPort, proxyUrl } = resolveDevPorts();
  const children = [
    spawn(process.execPath, ['--watch', '--env-file-if-exists=.env', 'server/index.mjs'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(apiPort) },
    }),
    spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js')], {
      stdio: 'inherit',
      env: { ...process.env, API_PROXY_URL: proxyUrl },
    }),
  ];
  function close(code = 0) {
    children.forEach((child) => child.kill());
    process.exit(code);
  }
  process.on('SIGINT', () => close());
  process.on('SIGTERM', () => close());
  children.forEach((child) => child.on('exit', (code) => close(code ?? 0)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) start();

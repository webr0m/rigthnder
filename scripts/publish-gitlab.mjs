// Usa únicamente la credencial ya guardada para gitlab.com. Nunca la escribe a disco ni la imprime.
import { spawnSync } from 'node:child_process';
const credential = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=gitlab.com\n\n',
  encoding: 'utf8',
  timeout: 10_000,
  windowsHide: true,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
});
const parts = Object.fromEntries(
  (credential.stdout || '')
    .trim()
    .split('\n')
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1).trim()];
    }),
);
const token = process.env.GITLAB_TOKEN || parts.password;
if (!token) {
  console.log(
    'GitLab: no hay una credencial disponible. Inicia sesión con Git Credential Manager o usa glab auth login y vuelve a intentar.',
  );
  process.exit(2);
}
const headers = { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' };
const user = await fetch('https://gitlab.com/api/v4/user', { headers });
if (!user.ok) {
  console.log(`GitLab: la credencial disponible no permite acceder a la API (${user.status}).`);
  process.exit(2);
}
const identity = await user.json();
if (identity.username !== 'ridrogo') {
  console.log('GitLab: la sesión disponible no corresponde a ridrogo. No se creó ningún proyecto.');
  process.exit(2);
}
const existing = await fetch('https://gitlab.com/api/v4/projects/ridrogo%2Frigthnder', { headers });
if (existing.status === 404) {
  const created = await fetch('https://gitlab.com/api/v4/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Rigthnder',
      path: 'rigthnder',
      visibility: 'public',
      description:
        'App de citas con valores compartidos. Node.js, React, Android/iOS y AdMob. MIT.',
    }),
  });
  if (!created.ok) {
    console.log(`GitLab: no se pudo crear el proyecto (${created.status}).`);
    process.exit(2);
  }
  console.log('GitLab: proyecto público creado en https://gitlab.com/ridrogo/rigthnder');
} else if (!existing.ok) {
  console.log(`GitLab: no se pudo verificar el proyecto (${existing.status}).`);
  process.exit(2);
} else console.log('GitLab: el proyecto ya existe; se conservará su contenido.');

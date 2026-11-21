import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPasswordRecoveryPath, isEmailVerificationPath } from '../src/app-routes.mjs';

test('verification route accepts its trailing slash without matching other paths', () => {
  for (const path of ['/verificar-correo', '/verificar-correo/'])
    assert.equal(isEmailVerificationPath(path), true);
  for (const path of ['/app', '/verificar-correo/extra'])
    assert.equal(isEmailVerificationPath(path), false);
});

test('password recovery accepts canonical and legacy route names', () => {
  assert.equal(isPasswordRecoveryPath('/recuperar-contrasena'), true);
  assert.equal(isPasswordRecoveryPath('/restablecer-contrasena'), true);
  assert.equal(isPasswordRecoveryPath('/recuperar-contrasena/'), true);
  assert.equal(isPasswordRecoveryPath('/restablecer-contrasena/'), true);
  assert.equal(isPasswordRecoveryPath('/app'), false);
});

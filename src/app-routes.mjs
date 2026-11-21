const passwordRecoveryPaths = new Set(['/recuperar-contrasena', '/restablecer-contrasena']);

export const isPasswordRecoveryPath = (pathname) =>
  passwordRecoveryPaths.has(pathname.replace(/\/$/, '') || '/');

export const isEmailVerificationPath = (pathname) =>
  pathname.replace(/\/$/, '') === '/verificar-correo';

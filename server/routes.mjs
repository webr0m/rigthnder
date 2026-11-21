const pages = new Set([
  '/',
  '/app',
  '/demo',
  '/privacidad',
  '/terminos',
  '/seguridad-infantil',
  '/eliminar-cuenta',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/verificar-correo',
  '/moderation',
]);
export const isPageRoute = (pathname) => pages.has(pathname.replace(/\/$/, '') || '/');

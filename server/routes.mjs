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
]);
export const isPageRoute = (pathname) => pages.has(pathname.replace(/\/$/, '') || '/');

# Desplegar Rigthnder en Namecheap y Cloudflare

Destino solicitado: **https://rigthnder.webrom.lat**. La aplicación requiere Node.js 22.13 o superior; el plan Stellar Plus observado tiene Node 24.21.0. Usar la entrada `app.cjs` para Passenger y un directorio de aplicación independiente. No subir solo el frontend: cuentas y mensajes requieren el backend.

## Paquete

```sh
pnpm build
node scripts/package-hosting.mjs
```

El script genera una carpeta de publicación nueva bajo `.deploy/`, con `dist`, backend, entrada Passenger, dependencias del servidor y una configuración inicial sin secretos. Excluye la base local y las credenciales. Comprimir el contenido incluyendo `.env` para subirlo.

La configuración inicial activa la demo para mostrar el MVP. Desactivar `DEMO_ENABLED` al preparar el servicio real. Google requiere añadir sus credenciales al `.env` privado del servidor y reiniciar; no editar secretos en GitHub/GitLab.

## cPanel

1. Crear el dominio `rigthnder.webrom.lat` sin compartir document root con el dominio principal. Document root: `/home/jyscqqde/rigthnder.webrom.lat`.
2. Subir y extraer el paquete en `/home/jyscqqde/rigthnder-app` (fuera del directorio público).
3. En **Setup Node.js App**, crear una aplicación Node 24, modo Production, root `rigthnder-app`, URL `rigthnder.webrom.lat/`, startup `app.cjs`.
4. Ejecutar **Run NPM Install**, luego Restart. El paquete del hosting contiene solo dependencias del backend; no hay que compilar Vite en el hosting.
5. Conservar la base en `/home/jyscqqde/rigthnder-data/rigthnder.sqlite`. No copiar la base de pruebas local.
6. Obtener un certificado válido para el subdominio en el origen con AutoSSL/Namecheap SSL y verificarlo antes de usar Cloudflare Full (strict).

Passenger puede crear un archivo de ejemplo `app.js`; la entrada real es `app.cjs`. El proceso lee `.env` privado antes de importar el backend.

## Cloudflare

Crear un registro **A** para `rigthnder` apuntando a la IP confirmada por cPanel: `162.0.209.150`. Usar proxy y TTL automático una vez que el origen tenga HTTPS válido. Mantener SSL/TLS Full (strict); no debilitar el modo de toda la zona para resolver un certificado de un subdominio.

No cambiar registros de webrom.lat, correo u otros subdominios. No cachear `/api/*` ni respuestas privadas; el backend envía `Cache-Control: no-store`.

## Validación

- DNS resuelve al destino esperado.
- HTTPS abre sin advertencias.
- `/api/health` informa `ok: true`.
- Recursos JS, CSS, fuentes y fotos cargan sin errores.
- Demo, filtros, match y chat funcionan en el dominio público.
- Cookies de sesión con HttpOnly y Secure; no exponer `.env`, fuentes privadas o la base.
- Google vuelve exactamente a la URL registrada.

Para futuras actualizaciones, conservar `.env` y `rigthnder-data`, sustituir únicamente los archivos de la aplicación y reiniciar Passenger. Hacer respaldo consistente antes de migraciones de base. No sobrescribir una base con la de desarrollo.

Fuentes: [Node.js en Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/10047/2182/how-to-work-with-nodejs-app/), [DNS en Cloudflare](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/).

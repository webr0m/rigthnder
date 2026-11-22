# Beta 1.11 · 21 de noviembre de 2026

## Código y web

Código funcional: `874b851` (incluye `a26045e`), sincronizado en GitHub y GitLab. Web `1.0.0-beta.1.11` publicada en **https://onlyfachos.webrom.cc**. Se conserva la misma base SQLite; no se creó otra base de usuarios. La prueba privada de migración preservó sin cambios los campos de las 18 cuentas reales existentes; el respaldo contenía 157 cuentas no semilla, incluidas cuentas de demostración.

Paquete final de hosting: SHA-256 `537C820BA50C0FCC11C2D8B8853E39FAFF85E9A174C7E8E267FAAA5AB7802E62`. Despliegue con respaldo coherente, copia privada de entorno, ensayo de migración e integridad antes de reemplazar archivos. No se publicaron credenciales ni se concedieron roles de moderación a usuarios reales.

## Verificación

- 101 pruebas locales de la aplicación más la nueva prueba del service worker; [CI final](https://github.com/webr0m/rigthnder/actions/runs/44952174019) ejecuta las 102 pruebas del árbol completo, comprobaciones sintácticas y build web.
- [Android debug e iOS simulador](https://github.com/webr0m/rigthnder/actions/runs/44951783968): correctos. La corrección posterior solo modifica el service worker de notificaciones web y añade su prueba.
- Revisión visual en español, inglés y alemán: Google abre el formulario y conserva el borrador, confirmación de correo con reintento ante una caída temporal, login y panel con paginación. A 390 px el acceso, feed, denuncia y chat no presentan desbordamiento horizontal.
- Producción: siete rutas públicas correctas, JS/CSS coinciden con el build, acceso nativo CORS permitido, mutación desde origen ajeno rechazada y panel administrativo no accesible sin sesión. `.env` devuelve 403 y las rutas de SQLite/código/CLI privadas devuelven 404.
- Google, recuperación, verificación de correo y configuración push web/Android habilitados en la API. No se enviaron correos de prueba a usuarios ni se modificaron sus perfiles.
- `pnpm audit --prod`: cero vulnerabilidades conocidas en 103 dependencias consultadas.

## Android y distribución

Compilación `10015`, `1.0.0-beta.1.11`, identificador existente `com.rigthnder.app`. [Build final de Google Play](https://github.com/webr0m/rigthnder/actions/runs/44952179928) correcto. SHA-256 del AAB firmado: `1D8CEA6741BDDD3A6F7E9E74B180C6E87B750C079516C31250F1FC2464DD8BCF`. Firma y manifiesto verificados; mapeo R8 incluido.

[Arranque Android y FCM](https://github.com/webr0m/rigthnder/actions/runs/44951780270): correcto en instalación limpia y segundo arranque, ambos con señal `screen=access` tras renderizar. Instrumentación Firebase: una prueba, cero errores; token temporal registrado y revocado sin publicarlo. Los 35 archivos web del AAB compartidos con el APK optimizado probado coinciden byte por byte; el único cambio posterior es el worker web, comprobado aparte con su prueba y comparación con la fuente final. No se instaló un APK reconstruido ni se desactivaron protecciones de Google Play.

Google Play recibió el AAB y lo muestra **disponible para verificadores internos** (versión interna 9). La comprobación del 22 de noviembre también confirma **disponible para verificadores específicos en Alpha** (versión 10, lanzamiento mostrado el 21 de noviembre). Es distribución beta a los grupos existentes, no publicación pública de producción. [Acceso al grupo interno autorizado](https://play.google.com/apps/internaltest/4701515858079115212).

Play reconoce el archivo ReTrace y conserva una advertencia no bloqueante por símbolos nativos de bibliotecas precompiladas del proveedor. No se fabricaron símbolos ni se desactivó R8.

[Auditoría, fallos corregidos y límites](AUDITORIA-2026-11-21.md). La prueba de emulador no sustituye un teléfono físico. iOS no incluye firma de distribución, TestFlight ni APNs. La aprobación publicitaria y de tiendas depende de sus proveedores.

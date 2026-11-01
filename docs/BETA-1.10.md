# Beta 1.10 · 1 de noviembre de 2026

## Reparación

Se corrige la espera infinita de los proxies de Capacitor en almacenamiento seguro, Google y notificaciones. El defecto se reproducía al abrir Android sin una sesión válida y era anterior a los cambios de auditoría de octubre. [Revisión de los 22 hallazgos y evidencia](AUDITORIA-2026-11-01.md).

Se añaden límites de tiempo, recuperación sin eliminar credenciales, protección contra respuestas antiguas y limpieza no bloqueante tras el acceso. También se ajustan el menú de perfiles, espacio del chat, confirmación escrita de borrado, fechas, rachas, validación ES/EN/DE y respuesta 404 real.

## Web

- Publicada en https://onlyfachos.webrom.cc; `/app` llega al acceso y `/demo` conserva el aislamiento de los perfiles ficticios.
- Se conservó la misma SQLite y sus 79 cuentas existentes al desplegar. Respaldo coherente privado `onlyfachos-beta1-10-2026-11-01T16-33-32-848Z`, incluida la configuración privada. No se creó ni trasladó la base de datos.
- Paquete final SHA-256: `B8E859A52FCB4B090BAC4703DE4E50AC1F798EDE8C020E2C684BFEF6125DB23B`. El HTML publicado referencia el mismo archivo JavaScript que el build final comprobado.

## Android

- Paquete `com.rigthnder.app`, versión `1.0.0-beta.1.10`, código `10014`, target SDK 36. Se conserva el identificador y la firma de carga del titular.
- AAB firmado SHA-256: `09BA64D0C2D66933A56D4A00C49D1CD58887D5860082684A75EA0C1974E1CCF7`.
- [Compilación y validación de AdMob/FCM/R8](https://github.com/webr0m/rigthnder/actions/runs/41326693023). IDs publicitarios propios; no se solicitan anuncios durante el acceso ni las pruebas anónimas.
- [Prueba optimizada de arranque y registro FCM](https://github.com/webr0m/rigthnder/actions/runs/41327474378): los dos arranques alcanzan la pantalla de acceso. Los assets web del APK probado y el AAB coinciden. La prueba instrumentada de plugins/Firebase pasa y revoca su token temporal.
- La consola confirma **Disponible para verificadores internos**, versión **10014 · OnlyFachos beta 1.10**. [Actualización para el grupo interno autorizado](https://play.google.com/apps/internaltest/4701515858079115212). No es acceso público de producción.
- La misma compilación se promovió a Alpha al 100% del grupo existente y se confirmó el envío. La consola muestra **Cambios en la etapa de revisión** y verificaciones rápidas en curso; todavía no equivale a aprobación ni disponibilidad pública.
- Persiste la advertencia no bloqueante de símbolos de bibliotecas nativas precompiladas; ReTrace está incluido. No se reduce el catálogo de dispositivos. Compatibilidad con teléfonos sin servicios Google y entrega push en el teléfono físico del titular no certificadas.

## Otras comprobaciones

- 73 pruebas y comprobaciones de compilación correctas. Dependencias de producción sin vulnerabilidades conocidas en el registro consultado.
- [Android debug e iOS simulador](https://github.com/webr0m/rigthnder/actions/runs/41326700771) compilan. iOS no es una publicación en App Store ni un IPA firmado.
- DNS de correo de todo `webrom.cc`: SPF/DMARC requieren un trabajo separado de inventario de remitentes; no se endurecen sin comprobar los servicios que envían correo.

La aprobación de Alpha y producción, y la aprobación/vinculación pública de AdMob, dependen de los pasos y revisiones del proveedor. Las correcciones de código no sustituyen esa aprobación.

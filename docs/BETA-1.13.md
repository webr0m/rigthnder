# Beta 1.13 · permiso push Android · 22 de noviembre de 2026

Código `1.0.0-beta.1.13`, Android `10017`.

## Causa del error `undefined (reading receive)`

Capacitor Android 8.5.3 resolvía `checkPermissions()` sin un objeto cuando R8 full mode eliminaba el metadato de permisos que se obtiene mediante reflexión. El mapa de 10016 renombraba `CapacitorPlugin` y no conservaba el campo `PluginHandle.pluginAnnotation`. La comprobación JS leía `.receive` sin validar el resultado. Una prueba debug que obtenía el token directamente no cubría esta ruta de la versión optimizada.

Se incorporan en la app las reglas de conservación de interfaces de anotación de la [corrección oficial Capacitor #8646](https://github.com/ionic-team/capacitor/pull/8646), manteniendo R8 y la reducción de recursos para el resto del código. En el mapa nuevo las interfaces conservan su identidad y el campo de metadatos permanece. Se validan las respuestas de consulta, solicitud y restauración del permiso; una respuesta inválida falla sin registrar el dispositivo ni dar por concedido el permiso. La solicitud tiene un plazo y los fallos al restaurar no impiden devolver la limpieza de listeners.

## Pruebas

- 110 pruebas locales y [CI general](https://github.com/webr0m/rigthnder/actions/runs/45026237025) correctos, incluidos resultados de permiso ausentes, nulos, desconocidos y estados válidos; no hay registro con permisos inválidos.
- [Prueba Android optimizada](https://github.com/webr0m/rigthnder/actions/runs/45026244126) correcta: JS llama al plugin real en un APK release con R8, recibe `prompt`, Android muestra su diálogo, el usuario de prueba concede el permiso, se confirma `granted` y Firebase emite un token. El token temporal se revoca al terminar. También pasan arranque optimizado y dos pruebas instrumentadas de Firebase/notificación en primer plano.
- Esta prueba no preconcede `POST_NOTIFICATIONS`. La página de QA solo se incorpora al APK desechable de CI. El [AAB 10017 para Play](https://github.com/webr0m/rigthnder/actions/runs/45026248403) comprueba que no contiene ni esos archivos ni la entrada de prueba; no se publica una puerta de acceso de QA.
- La prueba no usa cuentas reales, no imprime tokens ni los envía a GitHub o al backend y no solicita anuncios.
- Diagnóstico privado del hosting: OAuth 200 y `testIamPermissions` 200 con `cloudmessaging.messages.create` concedido a la credencial FCM. Se usó el alcance de solo consulta `iam.test`, sin modificar IAM, claves o la base de datos. Esto demuestra autorización de envío, no recepción física.

## Despliegue

- Web publicada a las 10:16 de Chile en **https://onlyfachos.webrom.cc**, salud HTTP 200 con beta 1.13 y los 16 scripts de la compilación accesibles. Respaldo privado `onlyfachos-beta1-13-2026-11-22T13-16-20-601Z`; ensayo de migración íntegro y 18 cuentas reales preservadas de 161 cuentas no semilla, incluidas demostraciones. Se conserva la misma SQLite y `.env`.
- ZIP web SHA-256: `53177C8DE79C6483AFA88678788BA8ACF67C4C6EF94BB548731E925B2C09B431`.
- AAB firmado y firma verificada, código 10017; SHA-256: `74AE3B3BA8D8F175C40DDA8DE5A40D466DB189C460B10B75F835C0CDAD6D6DEF`. Play reconoce ReTrace; persiste la advertencia de símbolos de bibliotecas nativas precompiladas del proveedor.
- Google Play confirma 10017 disponible para verificadores internos desde las 10:20 de Chile. [Actualizar beta](https://play.google.com/apps/internaltest/4701515858079115212). La distribución pública continúa deshabilitada por la solicitud de acceso a producción pendiente de Google.
- El mismo 10017 se envió a Alpha al 100% del grupo existente. Play confirmó «Cambios en la etapa de revisión» y verificaciones rápidas en curso; se reinició la revisión pendiente de 10016 para incluir la corrección. No se afirma disponibilidad de 10017 en Alpha antes de su aprobación.
- El diagnóstico privado posterior al despliegue sigue mostrando cero dispositivos Android registrados en el backend. Se solicitó instalar 10017 y activar/probar desde una cuenta real; no hay todavía aceptación FCM ni recepción física observada con ese dispositivo. No se enviaron mensajes a otros usuarios.

Para verificar en un teléfono: instalar 1.13/10017, iniciar sesión en una cuenta real y activar Notificaciones en Ajustes. La activación solicita una prueba al servidor; «Probar notificaciones» permite repetirla tras el enfriamiento. Se debe distinguir un permiso concedido y un token registrado de la aceptación de FCM y la recepción física del aviso. No se da por confirmada esta última sin una entrega observada.

La corrección del permiso requiere instalar el nuevo Android: una actualización de la web no reemplaza el puente nativo de una app instalada. La comprobación de entrega desde el servidor a un teléfono real se registra por separado del permiso y del registro Firebase.

# Beta 1.14 · primera prueba abierta · 22 de noviembre de 2026

Código `1.0.0-beta.1.14`, Android `10018`, paquete `com.rigthnder.app`.

## Auditoría y correcciones

- Sesiones nativas: las escrituras en el almacén cifrado tienen un plazo de ocho segundos. La cola conserva el orden real de las operaciones aunque una respuesta tarde; un guardado anterior no puede sobrescribir una sesión posterior ni deshacer un cierre de sesión. La limpieza de sesiones vencidas también tiene plazo.
- Chats: una respuesta HTTP antigua no sustituye una respuesta más reciente que ya se mostró. La comparación usa la última respuesta aplicada y permite avanzar incluso si la red tarda más que el intervalo de consulta.
- Fotos y audio: una decodificación que termina después de cambiar de conversación se cancela. Si la autorización del micrófono llega tras salir del chat, se detienen sus pistas; se evita iniciar solicitudes simultáneas. Las grabaciones conservan sus propios fragmentos.
- Citas: una aceptación tardía no abre la celebración en otro chat ni cierra un diálogo que la persona acaba de abrir.
- Actualización Android: una búsqueda manual fallida elimina el resultado anterior para no mostrar que la app está actualizada junto a un error de búsqueda.

## Validación

- `pnpm test`: 113 pruebas correctas; `pnpm check`: comprobaciones de sintaxis correctas. [CI general](https://github.com/webr0m/rigthnder/actions/runs/45052326196).
- `pnpm build`: compilación web y servidor correctas.
- `pnpm audit --prod`: cero vulnerabilidades conocidas en 103 dependencias de producción. Es el resultado del registro en esta fecha, no una garantía de ausencia de vulnerabilidades.
- Pruebas de regresión para cancelación de archivos/micrófono y escrituras de sesión tardías, fallo de almacenamiento y limpieza vencida.
- Interfaz local con SQLite en memoria y perfiles ficticios: inicio de sesión, mensaje de texto, foto, cambio de chat y propuesta de cita pendientes de respuesta correctos. Una respuesta demorada 5,8 segundos no eliminó un mensaje más reciente recibido por la consulta siguiente. No se enviaron mensajes ni fotos a cuentas reales.
- [AAB de producción](https://github.com/webr0m/rigthnder/actions/runs/45052331674) correcto, sin la página ni la entrada de diagnóstico de CI y con mapeo ReTrace incluido. Firma de carga verificada.

## Push real verificado

El diagnóstico privado de producción del 22 de noviembre a las 17:49 UTC confirmó **un dispositivo Android registrado**, asociado a una cuenta real activa y una sesión vigente, con avisos de mensajes y citas activados. La prueba solicitada por el dispositivo fue aceptada por FCM a las **13:52:29.278 UTC** y la app confirmó recepción a las **13:52:29.773 UTC** (10:52 de Chile). No constan errores de envío ni elementos pendientes en la cola. El registro fue renovado a las 16:24:26 UTC.

Esto verifica aceptación del servidor FCM y recepción en la app; no constituye observación visual de la bandeja del teléfono ni prueba de todos los modos de ahorro de batería. No se envió una nueva notificación a terceros durante esta auditoría. No se publican tokens, cuentas ni contenido de mensajes.

## Web desplegada

Publicada a las **15:13 de Chile**, salud HTTP 200 con beta 1.14. Google, recuperación por correo y verificación de correo están habilitados. CORS nativo para `https://localhost` responde 204. Los 15 módulos JavaScript de la compilación responden HTTP 200. Los archivos privados `.env` y SQLite no se sirven públicamente.

Se mantiene la misma SQLite y el entorno privado. Respaldo `onlyfachos-beta1-14-2026-11-22T18-13-02-150Z`; ensayo de integridad y claves foráneas correcto y **18 cuentas reales preservadas**, de 165 cuentas no semilla que incluyen demostraciones.

ZIP SHA-256: `2242A9C852E1BF4FF012563F70B6DF158061EFF57A89BB6634E3E1548F6B36D8`.

AAB firmado SHA-256: `F05F25D7C01CAEBE8CC1B80D4C3BBDEBE404C14D88338301089EE39B174A73BC`.

## Google Play

Ficha completada en español latinoamericano, inglés y alemán; soporte y comentarios `admin@webrom.cc`; 177 países/regiones y resto del mundo seleccionados, prueba abierta sin límite de verificadores. Contenido de la app sin declaraciones pendientes en la consola. Los gráficos existentes se conservan como recursos predeterminados para las traducciones.

El AAB 10018 tiene una advertencia no bloqueante por símbolos de bibliotecas nativas precompiladas del proveedor. El mapeo ReTrace está incorporado; no se fabrican símbolos inexistentes ni se desactiva R8.

**Enviada a Google Play a las 15:19 de Chile**: la consola confirma «Cambios en la etapa de revisión», con verificaciones rápidas en curso. Se enviaron ocho cambios: lanzamiento completo de 10018 en prueba abierta, países/regiones, canal de comentarios y las tres fichas de idioma. La publicación administrada ya estaba desactivada; la disponibilidad pública depende de la aprobación y propagación de Google. No se afirma todavía que la beta sea descargable públicamente.

[Prueba Android optimizada](https://github.com/webr0m/rigthnder/actions/runs/45052336051) correcta en el tercer intento. El primero encontró un límite HTTP 429 de Maven; el segundo no pudo resolver DNS del dominio dentro del emulador. En el intento correcto, la primera apertura mostró el error recuperable de conexión, un único reintento llegó al acceso y el segundo arranque también llegó al acceso. Se conservaron los mismos criterios de la prueba, sin debilitarlos. El diálogo nativo de permiso, la respuesta concedida, el registro/revocación de un token real Firebase y las dos pruebas instrumentadas terminaron correctamente. Esto cubre el APK release optimizado y la recuperación, no elimina la posibilidad de fallos de red externos.

Invitación prevista de la prueba abierta: https://play.google.com/apps/testing/com.rigthnder.app. Su acceso depende de la aprobación y propagación de Play.

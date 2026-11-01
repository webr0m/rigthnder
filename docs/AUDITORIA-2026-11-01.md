# Auditoría de arranque y contraste con la revisión We2

Revisión del código, historial, servicios públicos y compilaciones Android del 1 de noviembre de 2026. El informe HTML aportado por el titular se trató como evidencia a comprobar; no se ejecutaron sus scripts ni se aplicaron automáticamente sus instrucciones.

## Causa del inicio detenido

Se reprodujo el indicador permanente de carga con el AAB 10012, en un emulador aislado Android 15 con Google Play. El proceso seguía vivo: comprobar únicamente `pidof` no detectaba el defecto.

La fase detenida era la lectura del registro pendiente de Google. Tres funciones `async` devolvían directamente un proxy de Capacitor (`SecureStorage` o `PushNotifications`). El proxy genera también una propiedad `then`. La resolución de promesas lo interpreta como un objeto thenable y espera indefinidamente. El fallo afectaba al arranque sin sesión, al flujo Google, al formulario cifrado y a la activación de push.

Este patrón ya está en el commit `b9b0272`, anterior a las correcciones de auditoría `d22496b` y `c48b485`. La revisión We2 también muestra el indicador de carga en su prueba Android. No hay evidencia de que los cambios de edad, contraste, denuncias, límites de chat o `FLAG_SECURE` causaran este bloqueo. Los anuncios se solicitan después del arranque y únicamente en la comunidad con sesión; no se estaban solicitando en el punto detenido.

Corrección: las funciones cargan y devuelven el módulo; el llamador accede a su plugin sin devolver el proxy a otra promesa. La prueba de regresión usa proxies con el mismo comportamiento `then`, no objetos planos que ocultarían el problema.

Además:

- Las solicitudes HTTP, incluido el cuerpo de respuesta, tienen un límite de 15 segundos. No se reintentan automáticamente escrituras que podrían duplicarse.
- La lectura de la sesión tiene un límite de 8 segundos; el fallo no elimina la credencial guardada. Las respuestas antiguas no pueden reemplazar una sesión nueva.
- El arranque tiene un límite total de 25 segundos, mensaje de recuperación y reintento. No se consumen enlaces OAuth de un solo uso tras un arranque fallido.
- La limpieza del formulario tras un acceso correcto no bloquea la entrada a la comunidad.
- La prueba Android exige una señal nativa emitida después del renderizado del acceso, tanto al instalar como al volver a arrancar. Solo registra nombres fijos de pantalla, sin datos personales.

## Revisión de los hallazgos del informe

| Hallazgo | Resultado de la comprobación |
|---|---|
| H1 · Edad | Corregido previamente en `c48b485`: fecha civil de Santiago compartida por cliente y servidor, límites 18–100 y años bisiestos. Pruebas de ambos lados de medianoche. Se conserva. |
| H2 · Cloudflare Insights | El HTML público actual no contiene el beacon de Insights; CSP `script-src 'self'`. No se observó el desajuste denunciado en esta comprobación. Esto no certifica todos los ajustes históricos del CDN. |
| H3 · Denuncia preseleccionada | Corregido previamente. Comprobado en la interfaz: ningún motivo marcado y envío deshabilitado hasta elegir. |
| H4 · Próximamente en tiendas | Se conserva: la distribución comprobada es beta interna/Alpha, no disponibilidad pública de producción. El titular pidió expresamente anunciar las tiendas como próximas. |
| H5 · Contraste de chats | Corregido previamente mediante estilos específicos del tema claro; no se reintroduce amarillo sobre blanco en los nombres. |
| H6 · Texto alternativo | Las imágenes decorativas de la portada sí tienen `alt=""`; los perfiles usan nombre o descripción. Un alt vacío es deliberado en decoración. |
| H7 · Borrado de cuenta | Añadida confirmación escrita ELIMINAR / DELETE / LÖSCHEN. Comprobado que el botón permanece deshabilitado hasta escribirla; no se borraron cuentas de producción. |
| H8 · Contador de fotos | Se conserva la corrección previa: se usa la galería si tiene elementos y la foto principal como alternativa. |
| H9 · Chat móvil y menú sobre foto | Confirmado el menú sobre la galería. Movido a una celda propia de la cabecera, con objetivo táctil de 44 px. El plan confirmado pasa al área desplazable del chat para dejar espacio a los mensajes. |
| H10 · Textos y fechas | Singular de racha, espacio propio del enlace de match y formato de cita compartido sin segundos, también en el resumen y plan confirmado. Las fechas sin hora conservan su día civil. |
| H11 · Bienvenida | Saludo neutral en el acceso. Se conserva iniciar sesión como opción inicial, según lo pedido por el titular. |
| H12 · Validación en otro idioma | Añadidos mensajes de validación según ES/EN/DE, conservando las validaciones específicas existentes. La presentación del globo depende del navegador; el navegador integrado no permitió verificar visualmente ese globo nativo. |
| H13 · Rutas falsas con 200 | Corregido en servidor y cliente con lista compartida de páginas válidas, respuesta 404 real y vista de página inexistente. API desconocida sigue devolviendo JSON 404. Prueba HTTP incluida. |
| H14 · Robots y sitemap | Corregido previamente y verificado en producción: archivos reales 200, `text/plain` y `application/xml`, respectivamente. |
| H15 · Twitter y canónico | Se conservan los metadatos añadidos previamente al HTML. |
| H17 · Texto almacenado | React representa texto escapado; no se encontró HTML de usuarios insertado con `dangerouslySetInnerHTML`. No se modifica destructivamente texto legítimo como si fuera HTML. Los futuros consumidores deberán escapar según su contexto. |
| H18 · CSRF | Además de SameSite=Lax, el servidor rechaza mutaciones con Origin ajeno a la lista permitida. Las rutas de modificación no se ejecutan mediante GET. Pruebas de orígenes y control de acceso existentes. |
| H19 · Capturas Android | Se conserva `FLAG_SECURE` al haber sesión. La llamada es independiente del arranque. Manifiesto con backup desactivado y tráfico en claro desactivado. |
| H20 · Diálogo de Google Play | Separado del bloqueo JavaScript confirmado. El informe usó un APK reconstruido y vuelto a firmar, por lo que no demuestra el comportamiento de la entrega original de Play. No se desactivó la protección de Play. Compatibilidad de distribución sin servicios Google no certificada. |
| H21 · SPF/DMARC | Pendiente de operación global del correo: DNS actual confirma `p=none` y SPF `~all`. Cambiarlo exige inventariar los remitentes de todo `webrom.cc`, incluido Gmail; no se cambian registros de otros servicios como parte de un arreglo de arranque. |
| H22 · Versión en health | Se conserva información operativa mínima, sin secretos ni datos de cuentas. El proyecto ya publica su versión en el repositorio abierto. |
| H23 · Abuso y bloqueo | Corregido previamente. Pruebas de 30 mensajes/minuto, límite de hilos nuevos, invitación pendiente única y bloqueo de mensajes en ambos sentidos. La afirmación de que el bloqueador puede seguir enviando no se reproduce con el código actual. |

Otros detalles: las horas sugeridas que ya pasaron quedan deshabilitadas en el planificador. Se mantienen la comprobación del servidor, el consentimiento mutuo de las citas y el aislamiento de la demo.

## Validación y límites

- 73 pruebas automatizadas locales y comprobación sintáctica; compilación web correcta.
- [Arranque Android y FCM con configuración publicitaria de producción](https://github.com/webr0m/rigthnder/actions/runs/41327474378): instalación limpia y segundo arranque llegaron al acceso, sin necesitar reintento en esa ejecución. Registro y revocación del token FCM correctos; ningún token se imprime o envía al backend.
- Los 36 archivos web del AAB 10014 coinciden byte por byte con los del APK optimizado probado. El código nativo no cambió entre ambas compilaciones.
- Dos pasadas intermedias mostraron el error recuperable de conexión al iniciar el emulador; no un indicador infinito. Se guardaron capturas y logs, se comprobó CORS en producción y se añadió espera de red más una comprobación acotada del reintento. La ejecución final pasó en ambos arranques al primer intento.
- `pnpm audit --prod`: sin vulnerabilidades conocidas en el registro consultado en esta fecha. No equivale a ausencia absoluta de riesgos.
- Google Play Vitals: sin clústeres de fallos/ANR percibidos por el usuario en los 28 días mostrados. Una espera JavaScript sin bloqueo del hilo no tiene por qué aparecer como ANR.
- Entorno local de QA con SQLite en memoria, datos ficticios y sin correos reales. Comprobación visual móvil de denuncia, menú y confirmación de borrado.
- La base de datos activa, sesiones del servidor y configuración privada de OAuth/FCM/correo se conservan. El despliegue realiza copia coherente de SQLite antes de sustituir archivos.
- Las pruebas no sustituyen la comprobación del titular en el teléfono concreto ni garantizan aprobación de una tienda.
- Play mantiene una advertencia no bloqueante de símbolos nativos. Las cuatro copias de `libdatastore_shared_counter.so` del proveedor ya llegan sin `.symtab` ni `.debug_info`; configurar Gradle no recupera esos símbolos. El mapeo ReTrace de R8 sí está incluido y reconocido. No se desactivó R8 ni se subieron símbolos ficticios.

Los identificadores de compilación, resultados nativos y recepción en Google Play se registran al finalizar en `BETA-1.10.md`.

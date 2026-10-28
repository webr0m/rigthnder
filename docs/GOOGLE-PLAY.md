# OnlyFachos en Google Play

Paquete Android: `com.rigthnder.app`. Beta `1.0.0-beta.1.8`, `10009`, target SDK 36. API: `https://onlyfachos.webrom.cc`. Incluye AdMob de prueba y FCM; no hay compras ni suscripciones. La revisión anterior `10008` excluía el SDK publicitario. Se actualizaron Anuncios, ID publicitario y Seguridad de datos con identificadores, IP/ubicación aproximada inferida por el SDK, interacciones y diagnósticos; publicidad/medición/prevención de fraude, además de los tokens FCM para funcionalidad de notificaciones. No se recoge GPS ni se comparten perfiles políticos, religión o conversaciones con anunciantes.

Referencia del proveedor: [datos del Google Mobile Ads SDK](https://developers.google.com/admob/android/privacy/play-data-disclosure). Las nuevas compilaciones deben reflejar su configuración efectiva, aun usando anuncios de prueba.

## Estado · 28 de octubre de 2026

- `10009 · OnlyFachos beta 1.8` disponible para verificadores internos. [Instalar para el grupo autorizado](https://play.google.com/apps/internaltest/4701515858079115212).
- Prueba cerrada Alpha: mismo paquete `10009`, lanzamiento al 100% del canal. Se enviaron los tres cambios (versión, anuncios y Seguridad de datos); la consola confirma **«Cambios en la etapa de revisión»**, con verificaciones rápidas todavía en curso. No equivale a aprobación ni publicación de producción. Se conservó el grupo de verificadores.
- AAB firmado SHA-256 `BA48EAFF453F540230D8D0D873D6857AE631F7EEFD5DF2A5FE8C023A8E7AADD0`. [CI](https://github.com/webr0m/rigthnder/actions/runs/40661327242) comprueba SDK AdMob, FCM, permiso AD_ID e identificadores de anuncios de prueba.
- En prueba interna se aceptó la excepción de validación AD_ID **solo para esta versión** porque aún existían artefactos antiguos activos sin SDK ni permiso publicitario; la compilación nueva sí incluye el permiso. La declaración global sigue indicando uso de ID publicitario. No se modificó la configuración para ocultar su uso.
- Anuncios: sí. ID publicitario: publicidad, estadísticas y prevención de fraude. Seguridad de datos incluye OAuth y recopila/comparte solo las categorías de SDK pertinentes; no comparte personalización ni datos sensibles del perfil con anunciantes. Las declaraciones guardadas están sujetas a la revisión de Google.
- Advertencias no bloqueantes de Play: sin archivo de desofuscación ni símbolos nativos de terceros. No se presenta la prueba interna como publicación de producción.

## Estado del envío · 27 de octubre de 2026

- Prueba interna: código `10008` activo, [enlace de instalación para el grupo autorizado](https://play.google.com/apps/internaltest/4701515858079115212).
- Prueba cerrada Alpha: paquete `10008`, actualización con márgenes seguros y Google, guardado y solicitud de envío confirmada. La consola aún muestra el cambio previo a revisión mientras ejecuta comprobaciones automáticas. Todavía no equivale a aprobación de esta actualización ni publicación de producción.
- Se utiliza el grupo de OnlyFachos, sin agregar listas de otros proyectos. Última comprobación: 5 direcciones; deben reunirse al menos 12 personas que acepten participar en la **prueba cerrada** durante 14 días continuos. Google contabiliza las inscripciones reales, no solo correos agregados a una lista.
- IARC: términos confirmados por el titular, clasificación guardada y corregida para no indicar ubicación precisa compartida ni moderación de chats. Se conservan bloqueo y denuncia. Seguridad infantil: normas públicas y responsable operativo confirmados.
- Gmail recibe el correo de admin@webrom.cc. Enviar como esa dirección desde Gmail ya está verificado.

## Ficha propuesta

- Nombre: OnlyFachos
- Idioma inicial: Español (Latinoamérica); la app también incluye inglés y alemán.
- Categoría: Citas. Gratuita. Exclusivamente mayores de 18 años.
- Descripción breve: «Conecta por tus valores. Chat directo y citas cuando ambos dicen que sí.»
- Descripción: «OnlyFachos es una comunidad de citas para personas adultas que quieren conectar por sus valores e intereses. Explora perfiles en un feed vertical, descubre referentes en común e inicia una conversación. Tanto mujeres como hombres pueden dar el primer paso, invitar, aceptar o sugerir otro plan. El match de la cita se confirma cuando la otra persona acepta; el día y el lugar requieren acuerdo de ambos. Puedes bloquear o denunciar desde perfiles y chats. Incluye español, inglés y alemán, temas claro y oscuro, recuperación de contraseña por correo y eliminación de cuenta. Los datos de política y religión son opcionales y tú eliges compartirlos. La beta contiene una demostración con perfiles ficticios, separada de las cuentas reales.»
- Responsable: Rodrigo Olmos
- Contacto público de soporte y seguridad infantil: admin@webrom.cc
- Web: https://onlyfachos.webrom.cc
- Privacidad: https://onlyfachos.webrom.cc/privacidad
- Eliminación: https://onlyfachos.webrom.cc/eliminar-cuenta
- Seguridad infantil: https://onlyfachos.webrom.cc/seguridad-infantil

## Compilación y firma

Ejecuta el workflow `Build Android for Google Play`. Produce un AAB **sin firmar**; no debe subirse así a Play. La firma de carga se aplica localmente con `jarsigner`, con una clave privada del titular. No publiques la clave ni su contraseña en Git, artefactos, logs o releases. Conserva una copia privada segura de la clave y del medio necesario para desbloquearla: la contraseña protegida con DPAPI solo se abre en el mismo usuario de Windows.

La clave de carga local se encuentra en `%LOCALAPPDATA%/OnlyFachos/signing/onlyfachos-upload.p12`; su contraseña está protegida con DPAPI en `password.dpapi`. El certificado público puede compartirse con Play App Signing. Esto no sustituye los respaldos privados del titular.

## Declaraciones que debe revisar el titular

La creación de la app requiere confirmar las políticas del programa y certificar el cumplimiento de las leyes de exportación de EE.UU. No se debe certificar automáticamente en nombre del titular sin su confirmación específica.

Seguridad de datos debe reflejar los datos reales: correo, nombre, identificador de usuario, edad/fecha de nacimiento, ciudad declarada (sin GPS), perfil, fotos, mensajes, audio y contenido opcional de política/religión. Se guardan en el backend para prestar el servicio. Desde `10009`, AdMob de prueba y FCM se declaran según su comportamiento y las instrucciones del proveedor; se contemplan los identificadores, diagnósticos, interacciones y ubicación aproximada del SDK publicitario aunque no se soliciten anuncios personalizados. No declarar que no se recopilan datos. El modo demo no sustituye pruebas con dos cuentas reales del operador.

La app permite eliminar datos desde Perfil → Ajustes y dispone de solicitud externa por correo. Hay denuncias dentro de la app, bloqueo y estándares públicos contra CSAE/CSAM. El responsable debe operar la moderación y atender ese correo. No declarar verificación documental o moderación automática que la app no tiene.

Las cuentas personales nuevas pueden necesitar una prueba cerrada con al menos 12 personas inscritas de forma continua durante 14 días antes de solicitar producción. La consola determina los pasos pendientes y Google revisa la publicación; subir una prueba interna no equivale a aparecer públicamente en la tienda.

Referencias oficiales: [API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878), [pruebas de cuentas personales](https://support.google.com/googleplay/android-developer/answer/14151465), [seguridad infantil](https://support.google.com/googleplay/android-developer/answer/14747720), [restricción de menores en citas](https://support.google.com/googleplay/android-developer/answer/16302250).

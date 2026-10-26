# OnlyFachos en Google Play

Paquete Android: `com.rigthnder.app`. Versión preparada: `1.0.0-beta.1.5`, código `10006`, target SDK 36. API: `https://onlyfachos.webrom.cc`. El identificador se conserva para mantener compatibilidad. Esta compilación excluye el SDK nativo de AdMob; no hay anuncios, compras ni suscripciones. El código de integración se conserva y `VITE_ADMOB_ENABLED=true pnpm mobile:android` vuelve a incluirlo para una futura versión, que requerirá revisar sus declaraciones de datos y anuncios.

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

Seguridad de datos debe reflejar los datos reales: correo, nombre, identificador de usuario, edad/fecha de nacimiento, ciudad declarada (sin GPS), perfil, fotos, mensajes, audio y contenido opcional de política/religión. Se guardan en el backend para prestar el servicio. La compilación preparada mantiene AdMob desactivado y no solicita publicidad. No declarar que no se recopilan datos. El modo demo no sustituye pruebas con dos cuentas reales del operador.

La app permite eliminar datos desde Perfil → Ajustes y dispone de solicitud externa por correo. Hay denuncias dentro de la app, bloqueo y estándares públicos contra CSAE/CSAM. El responsable debe operar la moderación y atender ese correo. No declarar verificación documental o moderación automática que la app no tiene.

Las cuentas personales nuevas pueden necesitar una prueba cerrada con al menos 12 personas inscritas de forma continua durante 14 días antes de solicitar producción. La consola determina los pasos pendientes y Google revisa la publicación; subir una prueba interna no equivale a aparecer públicamente en la tienda.

Referencias oficiales: [API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878), [pruebas de cuentas personales](https://support.google.com/googleplay/android-developer/answer/14151465), [seguridad infantil](https://support.google.com/googleplay/android-developer/answer/14747720), [restricción de menores en citas](https://support.google.com/googleplay/android-developer/answer/16302250).

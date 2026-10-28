# Beta 1.8 · 28 de octubre de 2026

Web `1.0.0-beta.1.8` publicada en **https://onlyfachos.webrom.cc** y Android `10009` disponible en prueba interna. Prueba cerrada Alpha y declaraciones enviadas; la consola confirma «Cambios en la etapa de revisión» mientras ejecuta las comprobaciones rápidas. Se conserva la misma base SQLite y sus 46 cuentas existentes al desplegar; respaldo consistente privado `onlyfachos-2026-10-28T15-38-55-649Z`. El paquete Node incluye sus dependencias auditadas y se comprobó fuera del repositorio, sin node_modules.

- Google se puede vincular de forma explícita a las cuentas de contraseña existentes, conservando su `users.id`, perfil, fotos y conversaciones. Exige contraseña, correo Google verificado coincidente y sesión vigente. No crea una base de datos nueva ni mueve las cuentas a Firebase.
- Push web y Android activado en el servidor: registro voluntario, mensajes y citas con contenido genérico, preferencias y bloqueos, revocación por sesión y cola persistente. Firebase añadido al proyecto OnlyFachos con Analytics desactivado; app Android registrada. Google validó la credencial; su clave privada se generó y permanece únicamente en el hosting. `/api/push/config` confirma ambas plataformas disponibles. iOS nativo requiere APNs/firma. [Detalles y límites](PUSH.md).
- AdMob: apps Android/iOS y banners propios creados; IDs públicos en `mobile-ads.json`. La nueva beta compila con anuncios de prueba. El banner espera el consentimiento y solo aparece en Comunidad, con espacio medido y separación de la navegación. Se retira en formularios, perfiles, chats, avisos de seguridad y al cerrar sesión; las respuestas tardías no pueden recuperarlo. La monetización real requiere UMP, fichas de tienda, app-ads.txt y revisión de AdMob.
- Auditoría: body-parser 2.4.0 y qs 6.17.0; `pnpm audit --prod` sin vulnerabilidades conocidas. Limitadores antes del parser, JSON comprimido rechazado y errores de JSON controlados. Respuestas antiguas, incluidas las exitosas con datos privados, no pueden sobrescribir una cuenta recién iniciada. Cerrar sesión confirma la revocación en el servidor antes de anunciar éxito y limpia las vistas privadas, tanto para cookies como para los dispositivos con push.
- 61 pruebas pasan: cuenta existente/Google, privacidad y revocación push, anuncios/consentimiento, errores de API y paquete Node ejecutado sin node_modules. Diálogo Google comprobado a 390 px sin desbordamiento y contraseña incorrecta rechazada; traducciones ES/EN/DE. Falta completar OAuth y validar recepción push y anuncios en teléfonos físicos con cuentas reales.

Android firmado: SHA-256 `BA48EAFF453F540230D8D0D873D6857AE631F7EEFD5DF2A5FE8C023A8E7AADD0`, [compilación AAB](https://github.com/webr0m/rigthnder/actions/runs/40661327242). [Android debug e iOS simulador](https://github.com/webr0m/rigthnder/actions/runs/40661331426) compilan correctamente. iOS sigue sin IPA firmado ni TestFlight. [Estado de Play](GOOGLE-PLAY.md).

## Distribución anterior verificada

# Beta 1.7 · 27 de octubre de 2026

Web publicada en **https://onlyfachos.webrom.cc**, versión `1.0.0-beta.1.7`. Se conserva la base activa y se creó el respaldo privado `onlyfachos-2026-10-27T19-23-02-537Z`. Ahora se abre primero Iniciar sesión; Crear cuenta queda como alternativa.

Se usa viewport-fit=contain y SystemBars de Capacitor para reservar el área de las barras del teléfono. CSS contempla los márgenes superiores, inferiores y laterales en el acceso, registro, perfil, ajustes, navegación, chat y ventanas. QA web con anchos de 360 y 390 px, altura reducida y márgenes simulados de 44 px arriba y 34 px abajo. Los botones quedaron fuera de esas franjas y el cuadro de mensaje termina antes de la navegación. Sigue siendo necesaria la prueba en teléfonos físicos; la simulación no emula el sistema operativo ni su teclado real.

Google OAuth configurado con audiencia externa en producción, únicamente nombre y correo; secreto en .env privado del servidor. Se verificaron googleEnabled y la redirección real al selector de cuentas. No se completó un acceso real durante la prueba. [Configuración y límites](GOOGLE.md).

44 pruebas pasan. Android e iOS para simulador compilan correctamente: [compilación móvil](https://github.com/webr0m/rigthnder/actions/runs/40567747913). Android 10008 firmado y activo en prueba interna: SHA-256 `1FA0A69A5FC863413CDA4023C9A871D570605E191C1CCF0D32F787635549C123`; [validación del AAB](https://github.com/webr0m/rigthnder/actions/runs/40567741554). iOS no es un IPA firmado ni una distribución TestFlight.

## Estado anterior

# Beta 1.6 · 26 de octubre de 2026

Web publicada en **https://onlyfachos.webrom.cc**, versión `1.0.0-beta.1.6`. Se conserva la base activa y se creó el respaldo privado `onlyfachos-2026-10-26T23-15-27-679Z`. Invitaciones visibles para ambas personas, aceptación bilateral con pantalla de match y cambios de plan de mutuo acuerdo. Sexo ofrece únicamente Hombre y Mujer; no se reasignan los datos históricos. 44 pruebas pasan. Inicio de sesión persistente opcional durante 30 días en web y móvil; detalles en [SESIONES.md](SESIONES.md).

Android: AAB firmado, código `10007`, target SDK 36, SHA-256 `D8E899BD1CC09C80291CED86CEB6405B2392FB046A9E8697484236A414F0BC24`. Reemplaza al `10006` en la prueba interna activa. Esta revisión excluye el SDK nativo de AdMob y el permiso AD_ID; CI comprueba su ausencia en el AAB. [Compilación y validación](https://github.com/webr0m/rigthnder/actions/runs/40418342376). [Instalación interna](https://play.google.com/apps/internaltest/4701515858079115212), únicamente para verificadores autorizados.

La misma compilación `10007` se envió como versión 2 de **Prueba cerrada - Alpha**, con lanzamiento al 100% de ese canal. Se confirmó la solicitud de envío en la consola, que sigue mostrando «Cambios que aún no se enviaron a revisión» mientras ejecuta las verificaciones previas. No se da por aprobada ni se afirma que ya haya comenzado la revisión formal. Se conservan los países, el contacto admin@webrom.cc y el grupo de OnlyFachos. La lista de correos no equivale a personas inscritas o activas. La consola exige al menos 12 participantes inscritos de manera continua durante 14 días antes de solicitar producción; la prueba interna no inicia ese requisito.

Ficha con recursos propios e ilustraciones de demostración etiquetadas como creadas con IA; privacidad, acceso de revisión por demo, anuncios desactivados, datos recopilados, eliminación, audiencia 18+ con bloqueo de menores, clasificación, seguridad infantil, funciones financieras, salud y carácter no gubernamental completados. IARC corregido para no atribuir ubicación precisa ni moderación de chats a la app: el bloqueo y las denuncias sí están disponibles. La aceptación de IARC y la responsabilidad operativa de seguridad infantil fueron confirmadas por el titular. No hay publicación de producción; cada nueva actualización cerrada queda sujeta a revisión de Google. [Preparación de Play](GOOGLE-PLAY.md).

Contacto público: Rodrigo Olmos, admin@webrom.cc. Reenvío a Gmail configurado y mensaje de prueba recibido. Envío como admin@webrom.cc verificado en Gmail. Privacidad, eliminación y seguridad infantil públicas en el dominio .cc.

iOS: compilación para simulador correcta con el almacenamiento Keychain y build 10007. [Validación móvil](https://github.com/webr0m/rigthnder/actions/runs/40418346705). No es un IPA firmado ni una distribución TestFlight.

## Estado anterior

# Beta web 1.0.0-beta.1.3 · 22 de octubre de 2026

Publicada y verificada en **https://onlyfachos.webrom.lat**. Respaldo privado consistente: `onlyfachos-2026-10-22T21-19-25-811Z`. DNS A con proxy Cloudflare y dominio cPanel apuntando al mismo Passenger. Regla de Cloudflare «OnlyFachos - dominio anterior» activa; HTTP y HTTPS redirigen directamente con 301, conservando ruta y consulta. Ambos dominios responden en `/api/health` con `1.0.0-beta.1.3`.

- Denuncia con controles de tamaño fijo, filas alineadas y casilla de bloqueo legible.
- Mi perfil con foto circular de 136 px en móvil, sin compresión por nombres largos.
- Fecha de nacimiento validada en el primer paso, en el campo y antes de avanzar: fechas reales, de 18 a 100 años; misma regla en correo y Google.
- Nuevas denominaciones «No denominational» y «Protestante».
- Etiquetas con Enter y tecla móvil «Hecho», sin avanzar el formulario; evita duplicados por mayúsculas. «Hablemos de» reemplaza «Debate me on».
- Español, inglés y alemán; cambios de idioma conservan el borrador. Se guardan idioma y apariencia al registrarse, iniciar sesión y en Ajustes.
- Nuevo DNS y dominio en el mismo hosting; páginas del nombre anterior redirigidas con HTTP 301, conservando ruta y parámetros. API antigua disponible para clientes móviles instalados.
- 31 pruebas pasan y comprobación móvil a 320 y 390 px. Las compilaciones nativas publicadas siguen en beta 1.1; su fuente compartida incluye estos cambios para la próxima compilación.

# Corrección de carga de fotos · 22 de octubre de 2026

Web `1.0.0-beta.1.2`. Publicada en https://rigthnder.webrom.lat con respaldo privado consistente `onlyfachos-2026-10-22T06-16-37-151Z`. Verificados en el dominio público dos JPG cargados sin error y avance al paso 2 del perfil. La carga previa fallaba con «The source image cannot be decoded» incluso usando un JPG válido: el lector generaba una URL `blob:` incompatible con la política CSP de imágenes de producción. Se usa FileReader y una URL `data:` permitida por la política existente.

- JPG, PNG y WebP comprobados con el build servido por Express/Helmet: salida JPEG de hasta 720 px y avance al siguiente paso del perfil.
- Una selección mixta conserva las fotos válidas y señala en español el archivo dañado. Se procesan una a una para reducir el uso de memoria y se puede volver a seleccionar el mismo archivo.
- La política CSP del servidor y la base de usuarios se conservan. El helper compartido también corrige la carga de fotos del chat.
- Las 26 pruebas del servidor pasan. Los paquetes móviles publicados de la sección siguiente conservan su versión anterior; esta corrección se publica en la web y en el código fuente compartido.

# OnlyFachos Beta 1 · 20 de octubre de 2026

Versión `1.0.0-beta.1.1`. [Recorrido de prueba, apps y límites](BETA-1.md).

## Publicado y compilado

- Web pública: https://rigthnder.webrom.lat, Namecheap Node 24 detrás de Cloudflare. `/api/health` confirma Beta 1.
- Despliegue con copia de archivos y respaldo SQLite consistente privado `onlyfachos-2026-10-21T02-38-16-776Z`. Se conservaron `.env`, cuentas y mensajes existentes.
- Perfil completo, Mi perfil, Ajustes, temas claro/oscuro/automático, filtros, bandejas de chat, bloqueo/denuncia y propuestas de cita en dos pasos.
- Android: APK debug compilado en GitHub Actions; paquete `com.rigthnder.app`, versión `1.0.0-beta.1.1`, código `10002`.
- iOS: app compilada para iPhoneSimulator en macOS/Xcode; nombre OnlyFachos, versión `1.0.0`, build `10002`. No es un IPA firmado para iPhone físico.
- Compilaciones: https://github.com/webr0m/rigthnder/actions/runs/39534018239. Los artefactos corresponden al código del commit `8d0f031`; la corrección web del 22 de octubre se publica por separado y permanece en el código compartido.
- GitHub: https://github.com/webr0m/rigthnder. GitLab: https://gitlab.com/ridrogo/rigthnder. Ambos repositorios reciben el mismo historial y la etiqueta de Beta 1; no hay un espejo automático configurado.

## Verificado

- 26 pruebas del servidor y build web correctos. CI de GitHub correcto.
- Aceptación exclusiva por el otro participante, cambios pendientes/rechazados conservan la cita anterior, lectura por conversación, archivo, ocultación de datos desde el servidor, pausa, filtros, visitas y denuncia privada con bloqueo.
- Prueba local por navegador: edición con artistas y Debate me on, ficha completa, ajustes y propuesta → aceptación explícitamente simulada → calendario `.ics` descargado con fecha UTC y lugar escapado.
- Ambos paquetes móviles íntegros y configuración iOS inspeccionada. CORS del backend permite el origen Android `https://localhost`.
- Descargas publicadas: https://github.com/webr0m/rigthnder/releases/tag/v1.0.0-beta.1.1. No se han probado dispositivos físicos ni publicado en tiendas.

## Configuración pendiente del titular

- Google OAuth real: cliente y secreto en servidor. Apple y recuperación por correo no están activados.
- iPhone físico/TestFlight: equipo Apple Developer, certificado y perfil de firma. Android: clave estable de distribución y prueba de dispositivos antes de futuras actualizaciones públicas.
- AdMob real: IDs propios, mensajes UMP y pruebas en dispositivos. Las builds nativas incluyen anuncios de prueba por defecto; el workflow de Play los desactiva y no hay anuncios web, pagos ni PRO activo.
- Verificación de selfies, distancias GPS, locales aliados, GIFs y push no están activados. Las pantallas indican su estado real.
- Moderación y soporte: bandejas privadas y herramienta de operador disponibles; el titular debe atenderlas y completar sus datos/políticas antes de comercializar.
- Colaboración de diseño: [guía](DISENO.md), módulos de pantallas separados y licencia MIT. El archivo de Figma anterior conserva Rigthnder y no refleja esta beta; no se publicó allí el nuevo diseño.

La actualización `1.0.0-beta.1.1` incluye las propuestas y respuestas en los avisos de chat y en el menú de actividad. El dominio público y los nuevos paquetes móviles usan esta revisión de Beta 1. GitLab puede requerir minutos de CI propios; la validación y compilación de esta entrega se ejecutaron correctamente en GitHub Actions.

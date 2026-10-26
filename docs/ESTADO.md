# Beta 1.5 · 26 de octubre de 2026

Web publicada en **https://onlyfachos.webrom.cc**, versión `1.0.0-beta.1.5`. Se conserva la base activa y se creó el respaldo privado `onlyfachos-2026-10-26T15-33-42-952Z`. Invitaciones visibles para ambas personas, aceptación bilateral con pantalla de match y cambios de plan de mutuo acuerdo. Sexo ofrece únicamente Hombre y Mujer; no se reasignan los datos históricos. 41 pruebas pasan.

Android: AAB firmado, código `10005`, target SDK 36, SHA-256 `EE31792E14AC77A9899CE67A14EC3BCE8C30C29EEF1BF5410902F002E25C9F03`. La versión se cargó y publicó en el segmento de prueba interna de Google Play. [Acceso de prueba](https://play.google.com/apps/internaltest/4701515858079115212), únicamente para verificadores autorizados. La consola exige completar la configuración y una prueba cerrada de 12 adultos durante 14 días para solicitar producción. La ficha y declaraciones se están completando; no está publicada para todo el público. [Preparación de Play](GOOGLE-PLAY.md).

Contacto público: Rodrigo Olmos, admin@webrom.cc. Reenvío a Gmail configurado y mensaje de prueba recibido. Envío desde Gmail pendiente de completar por el titular con la contraseña SMTP y la verificación de Google. Privacidad, eliminación y seguridad infantil públicas en el dominio .cc.

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
- AdMob real: IDs propios, consentimiento y pruebas; la integración opcional conserva IDs de prueba. No hay anuncios web, pagos ni PRO activo.
- Verificación de selfies, distancias GPS, locales aliados, GIFs y push no están activados. Las pantallas indican su estado real.
- Moderación y soporte: bandejas privadas y herramienta de operador disponibles; el titular debe atenderlas y completar sus datos/políticas antes de comercializar.
- Colaboración de diseño: [guía](DISENO.md), módulos de pantallas separados y licencia MIT. El archivo de Figma anterior conserva Rigthnder y no refleja esta beta; no se publicó allí el nuevo diseño.

La actualización `1.0.0-beta.1.1` incluye las propuestas y respuestas en los avisos de chat y en el menú de actividad. El dominio público y los nuevos paquetes móviles usan esta revisión de Beta 1. GitLab puede requerir minutos de CI propios; la validación y compilación de esta entrega se ejecutaron correctamente en GitHub Actions.

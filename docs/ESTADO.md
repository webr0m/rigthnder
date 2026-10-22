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

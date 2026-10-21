# OnlyFachos Beta 1 · 20 de octubre de 2026

Versión `1.0.0-beta.1.1`. [Recorrido de prueba, apps y límites](BETA-1.md).

## Publicado y compilado

- Web pública: https://rigthnder.webrom.lat, Namecheap Node 24 detrás de Cloudflare. `/api/health` confirma Beta 1.
- Despliegue con copia de archivos y respaldo SQLite consistente privado `onlyfachos-2026-10-21T02-28-40-448Z`. Se conservaron `.env`, cuentas y mensajes existentes.
- Perfil completo, Mi perfil, Ajustes, temas claro/oscuro/automático, filtros, bandejas de chat, bloqueo/denuncia y propuestas de cita en dos pasos.
- Android: APK debug compilado en GitHub Actions; paquete `com.rigthnder.app`, versión `1.0.0-beta.1.1`, código `10002`.
- iOS: app compilada para iPhoneSimulator en macOS/Xcode; nombre OnlyFachos, versión `1.0.0`, build `10002`. No es un IPA firmado para iPhone físico.
- Compilaciones: https://github.com/webr0m/rigthnder/actions/runs/39532685414. Los artefactos corresponden al código de interfaz del commit `f5c938a`; las correcciones siguientes son del backend y documentación.
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

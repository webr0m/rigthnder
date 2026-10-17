# OnlyFachos 0.2.1 · 16 de octubre de 2026

## Implementado y publicado

- Web: https://rigthnder.webrom.lat. Namecheap, Node 24 y Cloudflare con HTTPS.
- Nueva marca OnlyFachos y modos claro/oscuro siguiendo los mockups proporcionados. El dominio y los repositorios conservan sus nombres anteriores.
- Feed vertical paginado: scrolling sin swipes ni likes; búsqueda, filtros, actividad, referentes compartidos y misma ciudad.
- Móvil ajustado a la pantalla 5: cabecera y buscador antes de filtros, tarjetas completas con casillas, scroll único del documento y barra inferior fija. Saltos a perfiles conectados y regreso desde chat conservando la posición.
- Búsqueda por nombre, ciudad, ocupación, streamer, autor o creador, sin distinguir acentos.
- Perfil en tres pasos, dos a seis fotos, referentes, idiomas y expectativas. Datos sensibles opcionales con consentimiento y posibilidad de retirarlos.
- Chat directo con texto, fotos, stickers y reacciones. Grabación web de voz de hasta 60 segundos en navegadores compatibles y con permiso al micrófono.
- Rachas de conversación, señales voluntarias e invitaciones. Aceptación solo por la otra persona, rechazo sin cerrar el chat y coordinación del plan.
- Demo explícita con simulación de aceptación/rechazo. Los usuarios reales no ven perfiles ficticios.
- Bloqueo, denuncia, exportación y eliminación de cuenta.
- Migración SQLite aditiva. Respaldo consistente privado antes del despliegue; `.env` y base activa conservados.
- GitHub: https://github.com/webr0m/rigthnder.
- GitLab: https://gitlab.com/ridrogo/rigthnder. El repositorio existe; la actualización de esta versión requiere acceso Git disponible en este equipo. No hay sincronización automática configurada.

## Verificado

- 18 pruebas del servidor, incluida la compatibilidad de cuentas/mensajes anteriores, OAuth simulado, chat directo, búsqueda por referentes y aceptación bilateral.
- Build web y sincronización de los proyectos Android/iOS con la nueva interfaz, marca e iconos.
- Pruebas de navegador del feed, mensajes, stickers, invitación, aceptación simulada, coordinación y guardado del perfil de tres pasos. Revisión móvil de ambos temas.

## Pendientes de configuración o validación externa

- Google: añadir cliente OAuth y secreto privado al servidor.
- Apple, GIFs y PRO no están habilitados; no hay cobros ni suscripciones.
- AdMob: apps, consentimiento UMP, IDs propios y pruebas en dispositivos antes de anuncios reales.
- Compilar, firmar y probar apps Android/iOS y sus permisos de micrófono en dispositivos. No se ha generado un APK/AAB/IPA de release ni verificado grabación con hardware móvil.
- Invitar al amigo con su cuenta para colaborar. La guía de diseño ya refleja OnlyFachos.
- Figma anterior: https://www.figma.com/design/4c41jvZDxF8wAk5gc2P7yQ?node-id=2-2. Contiene Rigthnder, no este rediseño. Su biblioteca quedó pendiente por el límite Starter.
- Moderación operativa, contacto/políticas definitivas, recuperación de correo y controles de abuso a escala para abrir el servicio como producto comercial.

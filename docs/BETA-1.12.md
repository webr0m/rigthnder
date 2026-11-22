# Beta 1.12 · actualización, push y publicidad · 22 de noviembre de 2026

Versión de código `1.0.0-beta.1.12`, Android `10016`.

## Cambios

- Actualizaciones flexibles oficiales de Google Play: búsqueda automática al abrir/reanudar, búsqueda manual en Ajustes, descarga en segundo plano y botón para reiniciar e instalar. Se conserva la confirmación de Google; no se descarga ni instala código desde servidores ajenos a la tienda. La primera instalación de esta función necesita actualizar desde Play; los APK anteriores no contienen el nuevo puente nativo. No se interrumpen chats ni formularios con el aviso automático.
- Push Android visible también con la app abierta, canal creado antes del primer aviso, icono monocromo y prioridad alta para mensajes/citas que generan notificación visible. Se esperan las operaciones de eliminación del token antes de registrar otro.
- Activar push comprueba el registro y solicita una prueba al servidor. Ajustes permite repetirla; diferencia aceptación del proveedor y recepción confirmada por el dispositivo. Diagnóstico privado por dispositivo, sin guardar textos de conversaciones, tokens en logs ni respuestas privadas del proveedor. Solo se permite probar el dispositivo de la sesión actual, con enfriamiento y límite de frecuencia.
- Los errores de autenticación, permisos y proyecto FCM se distinguen de un token vencido: una mala configuración global no borra los dispositivos como si hubiesen sido desinstalados.
- Cerrar sesión afecta al dispositivo actual. «Cerrar todas las sesiones» queda separado y requiere confirmación. Se evita que cerrar la web elimine el registro push del teléfono.
- AdMob: un banner adaptativo no personalizado, solo en comunidad. Se oculta en chats, formularios, ajustes, búsquedas, denuncias y segundo plano. Al volver se reutiliza el banner y su altura, sin solicitar otro anuncio ni repetir el consentimiento por cada cambio de pantalla. Fallos de inventario colapsan el espacio y tienen enfriamiento; no hay intersticiales ni anuncios al abrir la app.
- Portada, app y moderación se cargan por separado para reducir el código inicial. Un fallo al cargar muestra reintento y conserva sesión/datos. Las preferencias de «Novedades» sin servicio de envío se retiran de Ajustes.

## Evidencia y límites al comenzar

- 109 pruebas locales correctas y build web correcto. Nuevas regresiones: API de prueba/recepción, vinculación a sesión, frecuencia, FCM HTTP y errores de IAM, pausa/reanudación de anuncios y estados de actualización.
- `pnpm audit --prod`: cero vulnerabilidades conocidas en 103 dependencias consultadas.
- Diagnóstico privado del servidor: cero registros Android; credencial del proyecto correcto y autenticación OAuth 200. No había tokens activos con los que validar una entrega real. Esto no demuestra recepción en un teléfono.
- Google Play muestra la solicitud de acceso a producción en revisión; la distribución pública depende de esa aprobación. AdMob mantiene publicación limitada y no encuentra aún la ficha pública del paquete. No se vincula otra app ni se cambia la configuración de otros proyectos.

Los resultados de compilación nativa, despliegue y distribución se añaden al finalizar. La comprobación de actualización mediante una versión futura y la recepción en teléfono físico se distinguen de las pruebas simuladas.

## Referencias del proveedor

- [Actualizaciones flexibles de Google Play](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java).
- [Prioridad de mensajes Android de FCM](https://firebase.google.com/docs/cloud-messaging/android-message-priority).
- [Banners adaptativos AdMob](https://developers.google.com/admob/android/banner).

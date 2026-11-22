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

## Despliegue y validación

- Web `1.0.0-beta.1.12` desplegada el 22 de noviembre a las 09:47 de Chile. Respaldo privado `onlyfachos-beta1-12-2026-11-22T12-47-47-845Z`; ensayo de migración íntegro y 18 cuentas reales preservadas, entre 161 cuentas no semilla (incluidas demostraciones). No se reemplazaron la base activa ni las credenciales.
- Salud HTTP 200 con la versión nueva; Google, recuperación y verificación de correo habilitados. Los 16 scripts de la compilación, incluidos los fragmentos de carga diferida, responden correctamente. Origen nativo `https://localhost` permitido; `.env` responde 403, código del servidor/base de datos 404 y diagnóstico push sin sesión 401.
- [CI final: 109 pruebas](https://github.com/webr0m/rigthnder/actions/runs/44985752312); [Android debug e iOS simulador](https://github.com/webr0m/rigthnder/actions/runs/44985269519); [AAB de producción 10016](https://github.com/webr0m/rigthnder/actions/runs/44985757630). «Producción» en este artefacto describe los IDs publicitarios y el servidor, no aprobación pública de la tienda.
- [Prueba Android y FCM](https://github.com/webr0m/rigthnder/actions/runs/45023915833): dos pruebas instrumentadas correctas, registro/revocación Firebase y notificación simulada visible en primer plano con contenido genérico y visibilidad privada. El primer inicio del emulador mostró error recuperable durante una interrupción de red; un reintento abrió el acceso y el arranque posterior también fue correcto. No hubo carga infinita. La primera prueba del canal se corrigió porque Android reserva al sistema sus ajustes de bloqueo; se comprueba la privacidad de la notificación en lugar de exigir ese valor del canal.
- Firma del AAB verificada; manifiesto `com.rigthnder.app`, código `10016`, versión `1.0.0-beta.1.12`, SDK destino 36. SHA-256 firmado: `B76F361E21BE13AD725E77591967292EC1BD9825365497548DEB9DB3DB80AC11`. Play reconoce el mapa ReTrace. Persiste la advertencia no bloqueante de símbolos de bibliotecas nativas precompiladas del proveedor.
- Android 10016 confirmado disponible para verificadores internos a las 09:54 de Chile. [Actualizar beta interna](https://play.google.com/apps/internaltest/4701515858079115212). El acceso público a producción permanece deshabilitado mientras Google revisa la solicitud.
- El mismo AAB 10016 se envió al grupo cerrado Alpha, al 100% del grupo existente. La consola confirmó «Cambios en la etapa de revisión» y verificaciones rápidas en curso. Esto no confirma aprobación ni disponibilidad de 10016 en Alpha; no se modificaron verificadores ni países.
- Comprobación local de interfaz: retorno Google simulado abre el registro, y el borrador cifrado conserva cambios al recargar después del guardado. No se usaron cuentas reales para registrar perfiles de prueba.
- Diagnóstico privado repetido después del despliegue: cero registros Android, proyecto correcto y OAuth 200. Se pidió actualizar desde Play y activar/probar notificaciones con una cuenta real en el teléfono. Todavía no hay evidencia de aceptación FCM ni recepción física. No se enviaron avisos a otros usuarios.

La comprobación de actualización mediante una versión futura, la entrega servidor–teléfono, los anuncios servidos reales y la distribución iOS/APNs permanecen fuera de las pruebas verificadas. La app instalada anterior necesita una actualización desde Play para incorporar el nuevo puente de actualizaciones.

## Referencias del proveedor

- [Actualizaciones flexibles de Google Play](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java).
- [Prioridad de mensajes Android de FCM](https://firebase.google.com/docs/cloud-messaging/android-message-priority).
- [Banners adaptativos AdMob](https://developers.google.com/admob/android/banner).

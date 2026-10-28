# Notificaciones de mensajes y citas

Web Push para navegadores compatibles y FCM HTTP v1 para Android. Se activan voluntariamente en Perfil → Ajustes → Notificaciones en este dispositivo. Se respetan Mensajes nuevos y Avisos de cita; no se envían novedades comerciales. La demo no registra dispositivos ni envía avisos reales.

Los avisos llevan solo el nombre de la app y texto genérico en español, inglés o alemán. Nunca incluyen nombres de personas, texto, fotos, audio, lugar/hora de una cita, religión ni datos políticos. Al tocarlos se abre Chats. El service worker no almacena páginas ni respuestas privadas.

## Servidor

Activado en Namecheap el 28 de octubre de 2026 para web y Android. `/api/push/config` devuelve `web: true` y `android: true`; esto confirma configuración, no recepción en teléfonos físicos. Google verificó la firma de la credencial sin enviar mensajes de prueba. La clave RSA se generó en el servidor y solo se subió su certificado público a Google. El certificado vence el **28 de octubre de 2027**: rotarlo antes de esa fecha, probar la nueva credencial y retirar la anterior después de verificar el cambio.

Configura una vez `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` y, para Android, `FCM_CREDENTIALS_PATH`. Las claves privadas permanecen fuera de los directorios públicos, con permisos 0600, y nunca usan prefijo `VITE_`. La credencial FCM necesita el rol `roles/firebasecloudmessaging.admin` en su proyecto; no necesita permisos de bases de datos ni correo.

En esta instalación el proyecto es `onlyfachos` y la cuenta exclusiva es `onlyfachos-push@onlyfachos.iam.gserviceaccount.com`. Firebase no reemplaza SQLite ni habilita Analytics. La configuración cliente Android `google-services.json` contiene identificadores públicos de Firebase y una API key restringida a sus APIs, sin clave privada de servidor.

SQLite añade `push_devices` y `push_outbox`. Cada dispositivo pertenece a una cuenta y sesión; cambiar de cuenta retira los avisos pendientes de la anterior. Cerrar sesión, caducar o revocar accesos y eliminar la cuenta impide nuevas entregas. Bloqueos y preferencias se comprueban también justo antes de enviar. Un proveedor puede haber aceptado una notificación antes de revocar la sesión; el sistema operativo podría mostrarla después.

Las entregas no bloquean el chat. Hay una cola persistente con hasta tres intentos y caducidad de cinco minutos. Los endpoints vencidos se eliminan. Las suscripciones web solo aceptan destinos de proveedores conocidos, sin URLs arbitrarias ni redes locales. No se escriben tokens ni mensajes en logs.

## Móviles y pruebas

Android usa `@capacitor/push-notifications`, canal `onlyfachos-activity` y permiso del sistema. La generación automática FCM está desactivada inicialmente; se activa al registrar notificaciones voluntariamente. La nueva versión requiere instalar el AAB actualizado. En iPhone, Web Push necesita un navegador y modo de instalación compatibles; la app iOS nativa aún necesita APNs, equipo Apple Developer y firma. No se presenta la configuración iOS como activada.

Las pruebas usan dispositivos y entregas simulados: privacidad de payload, destinatario, preferencias, bloqueo, cambio de cuenta, cierre de sesión, endpoints caducados, sesiones vencidas y reintentos tras reiniciar el servicio. La recepción real en Android/iPhone debe validarse en dispositivos con el permiso concedido; no se mandan avisos de prueba a cuentas reales sin autorización.

Fuentes: [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [plugin Capacitor](https://capacitorjs.com/docs/apis/push-notifications), [privacidad de Firebase](https://firebase.google.com/support/privacy), [claves públicas de Firebase](https://firebase.google.com/docs/projects/api-keys), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

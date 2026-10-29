# Acceso con Google

## Estado · 28 de octubre de 2026

Configurado en Google Auth Platform, proyecto `onlyfachos`, cliente web del backend y audiencia externa en producción. Dominio autorizado: `webrom.cc`. Origen: `https://onlyfachos.webrom.cc`. Callback: `https://onlyfachos.webrom.cc/api/auth/google/callback`. Correo de asistencia OAuth: `ridrogo@gmail.com`, autorizado por el titular; notificaciones del proyecto: `admin@webrom.cc`. Se aceptó la política de Google con autorización explícita.

ID y secreto instalados en el `.env` privado del servidor con permisos 0600. No se descargó el secreto ni se guardó en el código o el dispositivo local. `/api/options` confirma `googleEnabled: true` y se verificó la redirección real al selector de Google con `openid email profile`. No se completó el acceso de una cuenta real ni se creó un perfil de producción durante esta prueba.

La vinculación explícita de cuentas existentes está publicada con beta 1.8. Se conservó la misma base SQLite durante el despliegue; Firebase se usa solo para notificaciones Android, sin sustituir la base ni crear perfiles duplicados por correo.

## Configurar otra instalación

El backend implementa el flujo de código OAuth de Google. Solicita solo `openid email profile`, valida `state` y su cookie, intercambia el código en Node y consulta UserInfo con el token obtenido. El secreto nunca se entrega al frontend. Los tokens de Google se descartan tras verificar la identidad; la app usa sus propias sesiones.

1. En [Google Auth Platform](https://console.cloud.google.com/auth/overview), crea o selecciona un proyecto.
2. Configura nombre **OnlyFachos**, correo de soporte, audiencia y usuarios de prueba si está en modo testing. Añade tu dominio cuando esté desplegado.
3. Crea un cliente OAuth **Aplicación web**.
4. Añade exactamente estas URLs de redirección:

```text
http://localhost:3000/api/auth/google/callback
https://onlyfachos.webrom.cc/api/auth/google/callback
```

5. En `.env` del servidor, configura:

```dotenv
GOOGLE_CLIENT_ID=tu-cliente.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-secreto
GOOGLE_REDIRECT_URI=https://onlyfachos.webrom.cc/api/auth/google/callback
PUBLIC_URL=https://onlyfachos.webrom.cc
```

En local usa las dos URLs `http://localhost:3000` equivalentes. Reinicia Node. El botón funciona cuando `/api/options` devuelve `googleEnabled: true`.

## Primer acceso

Google verifica el correo y devuelve el nombre. Si no existe la cuenta, la app pide fecha de nacimiento (18+), ciudad, sexo y consentimiento. La identidad pendiente expira en 60 minutos y se consume una sola vez. Una cuenta con contraseña que ya use ese correo debe entrar con contraseña: no se vincula automáticamente ni se sustituye su acceso.

Desde beta 1.8, esa cuenta puede vincular Google en **Perfil → Ajustes → Google → Vincular**. Se comprueba la contraseña actual y se emite un ticket de dos minutos, de un solo uso, ligado al usuario y su sesión. El callback exige un correo Google verificado idéntico y que la sesión siga vigente; una identidad Google no puede pertenecer a otro perfil. Solo se actualiza `users.google_sub` en la misma base SQLite: no se reemplaza la cuenta ni se copian perfiles, fotos o conversaciones. Los accesos posteriores buscan esa identidad y reutilizan el mismo `users.id`.

Si se cierra sesión o se restablece la contraseña antes de completar el flujo, la vinculación se rechaza. Android/iOS conservan el intercambio de un solo uso con comprobante SHA-256, también para vincular. Las pruebas verifican coincidencia de correo, contraseña incorrecta, identidad no verificada, duplicación, revocación y acceso posterior a la misma cuenta.

## Android/iOS

La app abre el backend en el navegador nativo con `@capacitor/browser`. Google vuelve al callback HTTPS del servidor y luego a `com.rigthnder.app://auth`. Ese enlace contiene un código temporal, no un token de sesión. La app lo intercambia con un comprobante SHA-256 ligado al inicio del flujo; expira en 2 minutos y se consume una vez. Desde beta 1.9 el comprobante se conserva temporalmente en almacenamiento seguro, se procesa también al arrancar desde el enlace y se elimina al intercambiarlo. El estado del proveedor vence a los 15 minutos; el perfil pendiente dispone de 60 minutos.

El script `mobile.mjs` configura el enlace en AndroidManifest e Info.plist. Desde beta 1.6, los tokens de sesión nativos se conservan en Keystore/Keychain si se marca Mantener mi sesión en este dispositivo (30 días); sin esa opción solo viven en memoria. No se guardan en localStorage. Antes de producción, usar enlaces universales/App Links verificados para reforzar el retorno y realizar pruebas reales de cada plataforma.

## Comprobarlo

Prueba aceptar, cancelar, estado inválido, registro de menor, segundo acceso, reinicio y expiración. Las pruebas automáticas usan respuestas de Google simuladas; no prueban tus credenciales reales.

Documentación: [flujo web de Google](https://developers.google.com/identity/protocols/oauth2/web-server), [políticas OAuth](https://developers.google.com/identity/protocols/oauth2/policies), [UserInfo](https://developers.google.com/identity/openid-connect/reference).

## Recuperar el formulario (beta 1.9)

La validación vencida devuelve `GOOGLE_REGISTRATION_EXPIRED`. La interfaz conserva el borrador cifrado y ofrece volver a verificar Google sin empezar de cero. Solo restaura la misma identidad; limpia el borrador al finalizar/cancelar. [Plazos y pruebas](BETA-1.9.md).

# Activar acceso con Google

El backend implementa el flujo de código OAuth de Google. Solicita solo `openid email profile`, valida `state` y su cookie, intercambia el código en Node y consulta UserInfo con el token obtenido. El secreto nunca se entrega al frontend. Los tokens de Google se descartan tras verificar la identidad; la app usa sus propias sesiones.

1. En [Google Auth Platform](https://console.cloud.google.com/auth/overview), crea o selecciona un proyecto.
2. Configura nombre **OnlyFachos**, correo de soporte, audiencia y usuarios de prueba si está en modo testing. Añade tu dominio cuando esté desplegado.
3. Crea un cliente OAuth **Aplicación web**.
4. Añade exactamente estas URLs de redirección:

```text
http://localhost:3000/api/auth/google/callback
https://onlyfachos.webrom.lat/api/auth/google/callback
```

5. En `.env` del servidor, configura:

```dotenv
GOOGLE_CLIENT_ID=tu-cliente.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-secreto
GOOGLE_REDIRECT_URI=https://onlyfachos.webrom.lat/api/auth/google/callback
PUBLIC_URL=https://onlyfachos.webrom.lat
```

En local usa las dos URLs `http://localhost:3000` equivalentes. Reinicia Node. El botón funciona cuando `/api/options` devuelve `googleEnabled: true`.

## Primer acceso

Google verifica el correo y devuelve el nombre. Si no existe la cuenta, la app pide fecha de nacimiento (18+), ciudad, identidad y consentimiento. La identidad pendiente expira en 10 minutos y se consume una sola vez. Una cuenta con contraseña que ya use ese correo debe entrar con contraseña: no se vincula automáticamente ni se sustituye su acceso.

## Android/iOS

La app abre el backend en el navegador nativo con `@capacitor/browser`. Google vuelve al callback HTTPS del servidor y luego a `com.rigthnder.app://auth`. Ese enlace contiene un código temporal, no un token de sesión. La app lo intercambia con un comprobante SHA-256 ligado al inicio del flujo; expira en 2 minutos y se consume una vez. Si la app fue cerrada durante el proceso y perdió el comprobante, el usuario inicia de nuevo.

El script `mobile.mjs` configura el enlace en AndroidManifest e Info.plist. Los tokens de sesión nativos quedan en memoria y se pierden al cerrar la app; no se guardan en localStorage. Antes de producción, usar enlaces universales/App Links verificados para reforzar el retorno y realizar pruebas reales de cada plataforma.

## Comprobarlo

Prueba aceptar, cancelar, estado inválido, registro de menor, segundo acceso, reinicio y expiración. Las pruebas automáticas usan respuestas de Google simuladas; no prueban tus credenciales reales.

Documentación: [flujo web de Google](https://developers.google.com/identity/protocols/oauth2/web-server), [políticas OAuth](https://developers.google.com/identity/protocols/oauth2/policies), [UserInfo](https://developers.google.com/identity/openid-connect/reference).

# Android, iOS y AdMob

La interfaz se empaqueta con Capacitor 8. El backend Node y SQLite sigue en el servidor; no corre dentro del teléfono. ID inicial `com.rigthnder.app`: define tu identificador definitivo antes de publicar.

## Android

```sh
pnpm mobile:android
pnpm exec cap open android
```

El script construye la interfaz, crea el proyecto si falta, registra el enlace de Google y el App ID de AdMob de prueba y sincroniza plugins. Se usa `https://rigthnder.webrom.lat` como API por defecto; puedes reemplazarla con `VITE_API_URL`.

Abre Android Studio, instala el SDK y prueba en emulador y teléfono. Genera una firma de release y un AAB para Play Console. No subas claves de firma al repositorio.

## iOS

```sh
pnpm mobile:ios
pnpm exec cap open ios
```

Requiere un **Mac con Xcode** para compilar, firmar y probar; preparar fuentes en Windows no produce un IPA. Configura equipo Apple Developer, Bundle ID, iconos y firma en Xcode. El proyecto usa Swift Package Manager.

Consulta los requisitos actuales de herramientas en [Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).

## Anuncios

La integración de `src/mobile.js`:

- No solicita anuncios en web.
- Está desactivada por defecto.
- Al pulsar **Mi perfil → Probar anuncios en móvil**, pide información de consentimiento y muestra el formulario si corresponde.
- Solo inicializa y carga cuando `canRequestAds` lo permite.
- Usa anuncios de Google de prueba por defecto y `npa: true`.
- No recibe ni envía valores políticos, perfil, intereses o mensajes.
- Incluye el acceso a **Privacidad de anuncios** y retira el banner antes de cambiar consentimiento.

Para probar, configura antes de compilar:

```dotenv
VITE_API_URL=https://rigthnder.webrom.lat
VITE_ADMOB_ENABLED=true
VITE_ADMOB_TEST_MODE=true
```

En AdMob crea apps Android e iOS y mensajes de privacidad UMP. No hagas clic en anuncios reales para probar. Para monetizar, reemplaza los **App IDs** de AndroidManifest e Info.plist, configura los **ad unit IDs** `VITE_ADMOB_*_BANNER_ID`, desactiva el modo de prueba solo en una build de release y verifica el consentimiento en dispositivos. App ID usa `~`; ad unit ID usa `/`.

Para iOS configura los SKAdNetwork IDs vigentes según la [integración oficial de Google](https://developers.google.com/admob/ios/quick-start). Esta versión no solicita ATT directamente: si necesitas IDFA, configura su mensaje en UMP y declara el propósito en Info.plist. Revisa Data Safety y App Privacy con los datos efectivamente recogidos por tus SDK.

El banner es una primera integración técnica, no ingresos garantizados. Su colocación y los insets deben revisarse en teléfonos reales; no debe tapar botones de navegación ni mensajes.

Google prohíbe segmentar publicidad personalizada con afiliación política. Mantén anuncios no personalizados, no vincules valores/perfiles a audiencias publicitarias y valida tu configuración con las [políticas de AdMob](https://support.google.com/admob/answer/10502938).

## Para las tiendas

Antes de enviar: moderación y atención de denuncias, bloqueo, políticas del operador y contacto, restricciones de menores, eliminación desde la app y vía `https://rigthnder.webrom.lat/eliminar-cuenta`, iconos de launcher, capturas, pruebas y revisión de privacidad. El acceso por Google puede requerir un acceso equivalente en iOS según [la guía de Apple](https://developer.apple.com/app-store/review/guidelines/#login-services); evaluar Sign in with Apple antes del envío. Apple pide una experiencia diferenciada para nuevas apps de citas, y la aprobación no está garantizada.

Referencias: [AdMob plugin](https://github.com/capacitor-community/admob), [consentimiento](https://github.com/capacitor-community/admob/blob/main/docs/consent.md), [seguridad de apps sociales y de citas en Play](https://support.google.com/googleplay/android-developer/answer/14747720), [eliminación de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111).

## Rediseño 0.2

El nombre visible y los iconos son OnlyFachos. Se conserva `com.rigthnder.app` como identificador y esquema de retorno OAuth para mantener compatibilidad. El chat usa grabación web con MediaRecorder y permiso al micrófono; iOS/Android declaran su uso. Requiere validar permisos, formato, grabación, ciclo de vida y reproducción en dispositivos reales antes de distribuir una release.

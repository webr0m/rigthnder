# Android, iOS y AdMob

[Preparación de anuncios reales y requisitos de publicación](ADMOB-PRODUCCION.md). La beta `10009` sigue usando anuncios de prueba; el paquete `10010` con IDs reales está preparado por separado y todavía no se distribuye.

La interfaz se empaqueta con Capacitor 8. Node y SQLite siguen en el servidor. Se conserva `com.rigthnder.app` para actualizar la aplicación existente.

## Android

```sh
pnpm mobile:android
pnpm exec cap open android
```

El script construye la interfaz, crea el proyecto si falta, registra el enlace de Google, incluye AdMob con el App ID de prueba y sincroniza plugins. Se usa `https://onlyfachos.webrom.cc` como API por defecto; puedes reemplazarla con `VITE_API_URL`. El script lee `.env`, igual que Vite, para que el SDK nativo y el JavaScript no queden desincronizados.

Abre Android Studio, instala el SDK y prueba en emulador y teléfono. Genera una firma de release y un AAB para Play Console. No subas claves de firma al repositorio.

## iOS

```sh
pnpm mobile:ios
pnpm exec cap open ios
```

Requiere un **Mac con Xcode** para compilar, firmar y probar; preparar fuentes en Windows no produce un IPA. Configura equipo Apple Developer, Bundle ID, iconos y firma en Xcode. El proyecto usa Swift Package Manager.

Consulta los requisitos actuales de herramientas en [Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).

## Anuncios

AdMob está integrado en las compilaciones nativas y usa anuncios de prueba por defecto. En `src/mobile.js`:

- No solicita anuncios en web.
- Se activa por defecto con `VITE_ADMOB_ENABLED=true` (o sin definir); usa `false` para generar un build sin SDK publicitario.
- Solo en Comunidad, tras iniciar sesión, pide la información de consentimiento UMP e inicializa el SDK si `canRequestAds` lo permite. Retira el banner en chats, formularios, perfiles abiertos, ventanas, al escribir, ocultar la app o cerrar sesión.
- Usa anuncios de Google de prueba mientras `VITE_ADMOB_TEST_MODE` no sea `false` y siempre solicita anuncios no personalizados (`npa: true`).
- No recibe ni envía valores políticos, perfil, intereses o mensajes.
- Ajusta el contenido con la altura real del banner, lo retira al cerrar sesión y expone **Mi perfil → Ajustes → Privacidad de anuncios** para cambiar o retirar el consentimiento.

Para probar, configura antes de compilar:

```dotenv
VITE_API_URL=https://onlyfachos.webrom.cc
VITE_ADMOB_ENABLED=true
VITE_ADMOB_TEST_MODE=true
VITE_ADMOB_ANDROID_APP_ID=ca-app-pub-3940256099942544~3347511713
VITE_ADMOB_IOS_APP_ID=ca-app-pub-3940256099942544~1458002511
```

`pnpm mobile:android` incluye el plugin y el App ID. El workflow **Build Android for Google Play** de beta 1.8 incluye AdMob y FCM, verifica su presencia y usa anuncios de prueba. Antes de subir el AAB hay que actualizar Anuncios, ID publicitario y Seguridad de datos en Play; la declaración anterior sin SDK publicitario solo describe hasta el código 10008.

Las apps y banners propios están registrados en `mobile-ads.json` (identificadores públicos del publicador). El modo de prueba usa siempre los App IDs y banners oficiales de demostración; el modo real usa los IDs propios o las variables de entorno. Rechaza IDs de prueba en modo real y publicadores que no coincidan. Para otra instalación reemplaza los IDs propios. Antes de monetizar, publica los mensajes UMP, enlaza las fichas de las tiendas y completa la revisión AdMob y app-ads.txt. No hagas clic en anuncios reales para probar.

En iOS el proyecto incluye `GADApplicationIdentifier` y el identificador SKAdNetwork de Google. Se retiró `GADIsAdManagerApp`, porque se usa AdMob. Revisa los SKAdNetwork IDs según la [integración oficial](https://developers.google.com/admob/ios/quick-start). Esta versión no solicita ATT directamente. Revisa Data Safety y App Privacy según los datos realmente recogidos por los SDK.

El banner es una primera integración técnica, no ingresos garantizados. Su colocación y los insets deben revisarse en teléfonos reales; no debe tapar botones de navegación ni mensajes.

Google prohíbe segmentar publicidad personalizada con afiliación política. Mantén anuncios no personalizados, no vincules valores/perfiles a audiencias publicitarias y valida tu configuración con las [políticas de AdMob](https://support.google.com/admob/answer/10502938).

## Para las tiendas

Antes de enviar: moderación y atención de denuncias, bloqueo, políticas del operador y contacto, restricciones de menores, eliminación desde la app y vía `https://onlyfachos.webrom.cc/eliminar-cuenta`, iconos de launcher, capturas, pruebas y revisión de privacidad. El acceso por Google puede requerir un acceso equivalente en iOS según [la guía de Apple](https://developer.apple.com/app-store/review/guidelines/#login-services); evaluar Sign in with Apple antes del envío. Apple pide una experiencia diferenciada para nuevas apps de citas, y la aprobación no está garantizada.

Referencias: [AdMob plugin](https://github.com/capacitor-community/admob), [consentimiento](https://github.com/capacitor-community/admob/blob/main/docs/consent.md), [seguridad de apps sociales y de citas en Play](https://support.google.com/googleplay/android-developer/answer/14747720), [eliminación de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111).

## Rediseño 0.2

El nombre visible y los iconos son OnlyFachos. Se conserva `com.rigthnder.app` como identificador y esquema de retorno OAuth para mantener compatibilidad. El chat usa grabación web con MediaRecorder y permiso al micrófono; iOS/Android declaran su uso. Requiere validar permisos, formato, grabación, ciclo de vida y reproducción en dispositivos reales antes de distribuir una release.

## Beta 1 compilada

Hay un [APK Android y una app para iOS Simulator](https://github.com/webr0m/rigthnder/releases/tag/v1.0.0-beta.1.1) generados por el workflow `Build mobile beta`. Se comparten el menú y el feed de la beta web. El paquete iOS requiere un Mac; para instalar en iPhone físico falta firma del titular. [Instrucciones y límites](BETA-1.md).

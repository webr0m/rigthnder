# OnlyFachos · Beta 1

Código `1.0.0-beta.1.8`, 28 de octubre de 2026. Dominio actual: https://onlyfachos.webrom.cc. Consulta [Estado](ESTADO.md) para saber qué versión está publicada. El paquete móvil sigue siendo `com.rigthnder.app`.

## Recorrido de prueba

1. Abre «Explorar la demostración». Sus perfiles, respuestas y aceptación simulada son ficticios. Las cuentas reales están separadas.
2. Recorre Comunidad con un solo scroll vertical en móvil. Toca el nombre de un perfil para abrir su ficha completa; «Escribir» abre el chat sin match previo.
3. En Chats, busca y filtra Todos / Sin leer / Citas / Archivados. Una conversación sin actividad por 14 días se archiva; un mensaje nuevo la recupera. Los contadores se calculan con mensajes recibidos y marcas de lectura.
4. Pulsa la taza para proponer una cita: día/hora → lugar público → enviar. Solo la otra persona puede aceptarla. La propuesta, su respuesta y su retiro dejan un aviso de texto en la conversación y alimentan los mensajes sin leer. La demo tiene un control explícito para simular esa aceptación. Un cambio pendiente o rechazado conserva el plan ya confirmado.
5. La cita confirmada permite descargar `.ics`, abrir una búsqueda en Maps y compartir/copiar el plan por decisión del usuario. No se envían mensajes a terceros automáticamente.
6. Mi perfil ofrece progreso real, visitas únicas, chats, citas confirmadas, fotos y acceso a cada paso del editor. Pausar quita el perfil del descubrimiento y conserva sus conversaciones.
7. Ajustes: claro/oscuro/automático, preferencias de avisos, ocultar partido/fe, desbloquear, soporte privado, exportar y eliminar cuenta. Ocultar se aplica en el servidor, no solo en la interfaz.
8. La denuncia admite motivo, detalles y bloqueo simultáneo. El destinatario no recibe la denuncia. La revisión es manual.
9. En una cuenta con contraseña, Perfil → Ajustes → Google → Vincular confirma tu contraseña y exige la misma dirección de Google verificada. Después puedes usar cualquiera de los dos accesos con el mismo perfil y conversaciones.
10. Activa los avisos en Ajustes → Notificaciones en este dispositivo. Los mensajes y citas se anuncian con texto genérico y puedes desactivarlos. Google/FCM no recibe el contenido de los chats. Android necesita una nueva compilación y el servidor configurado; iOS nativo requiere APNs y firma Apple.

Los mockups de referencia son «OnlyFachos-Nuevas-Pantallas-Modo-Claro.pdf» y «OnlyFachos-Nuevas-Pantallas-Modo-Oscuro.pdf». Sus retratos y documentos no se publican en el código abierto. Se preservan el scrolling y los campos «Sexo» y residencia en el extranjero de la versión anterior.

## Android e iOS

El workflow **Build mobile beta** de GitHub Actions se ejecuta manualmente y genera dos artefactos:

- `OnlyFachos-Android-beta1`: APK debug para pruebas, con identificador existente. No es una publicación en Google Play. Las futuras betas necesitan una clave de firma estable antes de distribuir actualizaciones sin reinstalar.
- `OnlyFachos-iOS-Simulator-beta1`: aplicación compilada para Simulator en Mac. No se instala en un iPhone físico. Un IPA para dispositivos/TestFlight requiere la cuenta Apple Developer del titular, su equipo y firma.

Ambos empaquetan la misma interfaz y conectan por HTTPS al backend público. Para recompilar: `pnpm install --frozen-lockfile`, `pnpm mobile:android` o `pnpm mobile:ios`; luego Android Studio o Xcode. En iOS, primero sincronizar para restaurar las rutas de paquetes SPM de Capacitor. No subir certificados ni perfiles de firma al repositorio.

## Integraciones y límites explícitos

- Google OAuth está implementado y probado con proveedor simulado; necesita credenciales reales en el servidor para activarse.
- Apple, verificación de selfies, suscripciones PRO, GIFs y push no están activos. Las pantallas de verificación/PRO reciben interés privado y no conceden insignias ni cobran.
- Los avisos configurables se guardan; la beta muestra actividad dentro de la app. No se solicitan permisos de push o GPS sin funcionalidad disponible. «Cerca» usa la ciudad declarada; no hay distancias ficticias ni locales aliados/descuentos inventados.
- AdMob se incluye por defecto en las compilaciones nativas con anuncios de prueba y consentimiento, y se retira al cerrar sesión. Requiere App IDs y ad units propios, mensajes UMP y prueba de dispositivos antes de monetizar. No se envían datos políticos, religiosos o mensajes a anuncios. El workflow de Play genera la beta sin SDK publicitario.
- La recuperación automática por correo necesita un servicio de correo transaccional. La pantalla lo informa.
- Las cuentas nuevas se basan en edad declarada; no hay verificación documental. El operador debe atender soporte/denuncias y completar sus datos y políticas antes de comercializar.

## Operación y validación

Las migraciones son aditivas. Conservar `.env` y SQLite privada y respaldar antes de desplegar. El endpoint `/api/health` identifica esta versión. Los detalles de citas antiguos se conservan; el endpoint anterior de edición unilateral se rechaza y remite a propuestas bilaterales.

`pnpm check`, `pnpm test` y `pnpm build`. Las 26 pruebas cubren también privacidad, pausa, lectura, archivo, propuestas bilaterales, visitas, filtros, denuncia y desbloqueo. La revisión visual se hace en móvil 390/320 px, escritorio y ambos temas.

El operador puede consultar las bandejas exclusivamente en el servidor privado:

```sh
DATABASE_PATH=/ruta/privada/rigthnder.sqlite node scripts/moderation.mjs reports
DATABASE_PATH=/ruta/privada/rigthnder.sqlite node scripts/moderation.mjs feedback
DATABASE_PATH=/ruta/privada/rigthnder.sqlite node scripts/moderation.mjs reviewed ID
```

Estos comandos contienen información privada: no pegar su salida en issues públicos. No hay panel administrativo expuesto por HTTP. «Reviewed» registra revisión; no suspende automáticamente una cuenta.

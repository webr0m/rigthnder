# Preparar anuncios reales

La beta distribuida `10009` utiliza anuncios oficiales de prueba. No se cambia esa compilación desde la consola de AdMob: los identificadores se incorporan al compilar una nueva app.

## Estado comprobado · 28 de octubre de 2026

- OnlyFachos Android e iOS tienen App IDs y un banner cada una; los identificadores públicos están en `mobile-ads.json`.
- Android usa el bloque `Comunidad · banner adaptable Android`, `ca-app-pub-8258058186888619/3867194366`.
- `https://onlyfachos.webrom.cc/app-ads.txt` responde 200 y declara el publicador correcto.
- AdMob indica **Debe revisarse / Publicación limitada**. La búsqueda exacta de `com.rigthnder.app` no devuelve una ficha que pueda vincularse. La beta cerrada de Google Play sigue en revisión; no es una ficha pública de producción.
- Play muestra 6 verificadores inscritos y exige al menos 12 durante 14 días continuos antes de solicitar producción. [Inscripción a la prueba cerrada](https://play.google.com/apps/testing/com.rigthnder.app), solo para las cuentas o el grupo habilitado por el operador. Compartir la web o la prueba interna no satisface este requisito; no se agregaron personas ni se modificó el grupo.
- El mensaje europeo de OnlyFachos está en borrador, limitado a sus dos apps, con inglés, español y alemán, botones de aceptar, no consentir y administrar opciones, y la política de privacidad del dominio actual. La lista de proveedores del CMP se comparte a nivel de cuenta: modificarla afecta también a las demás apps. Revisarla antes de publicar el mensaje; no confundir el alcance de la lista con la selección de apps de un mensaje.
- Los perfiles, mensajes, religión y datos políticos no se envían al SDK publicitario. Los anuncios siguen siendo no personalizados. La demostración no muestra anuncios reales.

## Compilar

El workflow **Build Android for Google Play** permite elegir `advertising: test` (predeterminado) o `production`, además de un `version_code` Android válido y nuevo. Solo compila: no firma ni publica automáticamente. Mantener el modo de prueba para QA y verificadores; no pulsar anuncios reales para comprobarlos.

```sh
gh workflow run android-play.yml -f advertising=production -f version_code=10010
```

La compilación verifica que el AAB contiene el App ID del modo seleccionado, el SDK AdMob, el permiso AD_ID y FCM. El número se pasa a Gradle con `-PonlyfachosVersionCode`; no cambia por sí solo las versiones instaladas ni la web. El artefacto se llama `OnlyFachos-Play-unsigned-production-10010`; requiere la clave de carga existente antes de subirlo a Play.

La compilación `10010` se completó correctamente en [GitHub Actions](https://github.com/webr0m/rigthnder/actions/runs/40752781767), incluidos los 61 tests y la verificación de componentes e ID publicitario de producción. Se firmó y verificó localmente con la clave de carga existente. SHA-256 del AAB firmado: `38E73899241F245619C04ED76626A88C5D903971332D856576FA7B5E421D4669`. **Preparado, sin subir ni distribuir**. La beta interna activa y el canal cerrado enviado a revisión conservan `10009` con anuncios de prueba.

## Antes de distribuir anuncios reales

1. Completar las pruebas y el acceso a producción que exige Google Play; publicar una ficha accesible que AdMob pueda encontrar.
2. Vincular esa ficha a la app existente de AdMob, sin crear otro App ID. Revisar el sitio web del desarrollador y la verificación de `app-ads.txt`.
3. Publicar el mensaje UMP de OnlyFachos tras revisar proveedores, finalidades y regiones. Configurar los mensajes adicionales que correspondan a la distribución. Mantener disponible Perfil → Ajustes → Privacidad de anuncios para cambiar o retirar consentimiento.
4. Obtener la aprobación de la app en AdMob. Verificar UMP y el banner en dispositivos físicos configurados como dispositivos de prueba.
5. Subir el AAB firmado con código nuevo y revisar la información de anuncios y Seguridad de datos en Play. La versión `10009` ya declara AdMob, OAuth y FCM; cualquier cambio futuro debe reflejar el comportamiento efectivo.

Fuentes: [preparación de apps en AdMob](https://support.google.com/admob/answer/10564477), [socios publicitarios del CMP](https://support.google.com/admob/answer/10113004), [mensajes europeos](https://support.google.com/admob/answer/10114014).

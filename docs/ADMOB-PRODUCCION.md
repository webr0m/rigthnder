# Preparar anuncios reales

Android `10010` está disponible en prueba interna con los IDs propios de AdMob y anuncios no personalizados; el mismo paquete fue enviado al canal cerrado. `10009` utilizaba anuncios oficiales de prueba. Cambiar la consola de AdMob no sustituye la instalación de la actualización: los identificadores se incorporan al compilar la app. La configuración real no equivale a aprobación de AdMob ni a disponibilidad pública en Google Play.

## Estado comprobado · 28 de octubre de 2026

- OnlyFachos Android e iOS tienen App IDs y un banner cada una; los identificadores públicos están en `mobile-ads.json`.
- Android usa el bloque `Comunidad · banner adaptable Android`, `ca-app-pub-8258058186888619/3867194366`.
- `https://onlyfachos.webrom.cc/app-ads.txt` responde 200 y declara el publicador correcto.
- AdMob indica **Debe revisarse / Publicación limitada**. La búsqueda exacta de `com.rigthnder.app` no devuelve una ficha que pueda vincularse. La beta cerrada de Google Play sigue en revisión; no es una ficha pública de producción.
- Play muestra 6 verificadores inscritos y exige al menos 12 durante 14 días continuos antes de solicitar producción. [Inscripción a la prueba cerrada](https://play.google.com/apps/testing/com.rigthnder.app), solo para las cuentas o el grupo habilitado por el operador. Compartir la web o la prueba interna no satisface este requisito; no se agregaron personas ni se modificó el grupo.
- El mensaje europeo `OnlyFachos · privacidad europea · ES EN DE` está **Publicado**, limitado a sus dos apps, con inglés, español y alemán, botones de aceptar, no consentir y administrar opciones, y la política de privacidad del dominio actual. Segmentación: EEE, Reino Unido y Suiza; no se habilitó la implementación automática en unidades de anuncios de otras apps.
- La lista de proveedores del CMP se limitó a **Google como único socio en toda la cuenta**, con autorización expresa del titular. La incorporación automática de socios frecuentes y de fuentes de anuncios está desactivada. Esta lista se comparte con las demás apps de la cuenta; el mensaje publicado sigue siendo exclusivo de OnlyFachos.
- Los perfiles, mensajes, religión y datos políticos no se envían al SDK publicitario. Los anuncios siguen siendo no personalizados. La demostración no muestra anuncios reales.

## Compilar

El workflow **Build Android for Google Play** permite elegir `advertising: test` (predeterminado) o `production`, además de un `version_code` Android válido y nuevo. Solo compila: no firma ni publica automáticamente. Mantener el modo de prueba para QA y verificadores; no pulsar anuncios reales para comprobarlos.

```sh
gh workflow run android-play.yml -f advertising=production -f version_code=10010
```

La compilación verifica que el AAB contiene el App ID del modo seleccionado, el SDK AdMob, el permiso AD_ID y FCM. El número se pasa a Gradle con `-PonlyfachosVersionCode`; no cambia por sí solo las versiones instaladas ni la web. El artefacto se llama `OnlyFachos-Play-unsigned-production-10010`; requiere la clave de carga existente antes de subirlo a Play.

La compilación `10010` se completó correctamente en [GitHub Actions](https://github.com/webr0m/rigthnder/actions/runs/40752781767), incluidos los 61 tests y la verificación de componentes e ID publicitario de producción. Se firmó y verificó localmente con la clave de carga existente. SHA-256 del AAB firmado: `38E73899241F245619C04ED76626A88C5D903971332D856576FA7B5E421D4669`. **Subido y disponible en prueba interna**; el canal cerrado Alpha figura en la etapa de revisión con el mismo paquete `10010`. No se comprobó la entrega real de anuncios ni el formulario en teléfonos físicos; para QA deben configurarse dispositivos de prueba y evitar clics de prueba sobre anuncios reales.

## Para completar la monetización

1. Completar las pruebas y el acceso a producción que exige Google Play; publicar una ficha accesible que AdMob pueda encontrar.
2. Vincular esa ficha a la app existente de AdMob, sin crear otro App ID. Revisar el sitio web del desarrollador y la verificación de `app-ads.txt`.
3. El mensaje europeo UMP de OnlyFachos ya está publicado. Verificar su recepción en dispositivos físicos y configurar los mensajes adicionales que correspondan a la distribución. Mantener disponible Perfil → Ajustes → Privacidad de anuncios para cambiar o retirar consentimiento.
4. Obtener la aprobación de la app en AdMob. Verificar UMP y el banner en dispositivos físicos configurados como dispositivos de prueba.
5. `10010` ya está subido a Google Play, disponible en prueba interna y enviado a revisión cerrada. Las declaraciones de anuncios y Seguridad de datos ya contemplan AdMob, OAuth y FCM; cualquier cambio futuro debe reflejar el comportamiento efectivo. La publicación de producción sigue pendiente del acceso que conceda Google.

Fuentes: [preparación de apps en AdMob](https://support.google.com/admob/answer/10564477), [socios publicitarios del CMP](https://support.google.com/admob/answer/10113004), [mensajes europeos](https://support.google.com/admob/answer/10114014).

La vista previa del editor de Google conserva texto genérico sobre publicidad personalizada y posible geolocalización precisa aun con un único socio seleccionado. No se modificó ese texto controlado por el proveedor ni se habilitó GPS: las solicitudes de la app mantienen `npa: true` y no aportan ubicación precisa. No se ha verificado el formulario servido en un teléfono; comprobarlo antes de distribuir el paquete con anuncios reales.

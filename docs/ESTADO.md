# Estado de la primera versión · 14 de octubre de 2026

## Publicado

- Web: https://rigthnder.webrom.lat
- Hosting: Namecheap Stellar Plus, Node 24, Passenger, entrada `app.cjs`.
- Cloudflare: registro A `rigthnder` con proxy; cifrado Full (strict), certificado de origen existente que cubre el subdominio; HTTP redirige a HTTPS.
- Backend y SQLite en directorios privados independientes. La base activa se conserva fuera de las versiones de código.
- GitHub público: https://github.com/webr0m/rigthnder (MIT).
- Figma: https://www.figma.com/design/4c41jvZDxF8wAk5gc2P7yQ?node-id=2-2 (pantalla capturada; biblioteca pendiente por límite Starter).

## Preparado

- Proyectos Android e iOS sincronizados con los plugins de App, Browser y AdMob.
- Iconos y pantalla de arranque con la marca negra y dorada.
- Acceso con Google implementado y probado con respuestas simuladas.
- AdMob con consentimiento y anuncios no personalizados de prueba, sin envío de valores políticos.
- Guía de colaboración en diseño, plantilla de issues y CI para GitHub/GitLab.

## Pendiente de cuentas / configuración

- Google: configurar cliente OAuth y secreto privado en el servidor para activar el botón.
- AdMob: configurar apps, mensajes UMP e IDs propios y probar en dispositivos antes de anuncios reales.
- GitLab: publicar en `ridrogo/rigthnder` cuando haya una sesión o credencial disponible. No se ha confirmado esa publicación.
- Compilar y firmar apps en Android Studio/Xcode; no se ha generado un APK/AAB/IPA de release.
- Invitar al colaborador al archivo de Figma y al repositorio usando su cuenta; no se enviaron invitaciones.

Las pruebas del servidor cubren 10 escenarios. La web pública es una primera versión con demo identificada; consultar `OPERACION.md` antes de abrirla como servicio de citas a escala.

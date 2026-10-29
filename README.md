# OnlyFachos

**Código beta `1.0.0-beta.1.9`**. Google vinculado a cuentas existentes, avisos push opcionales y publicidad móvil no personalizada. Android `10010` está disponible en prueba interna con IDs propios de AdMob; la aprobación publicitaria y el acceso a producción siguen pendientes. Las compilaciones de desarrollo usan anuncios de prueba por defecto. [Estado del despliegue](docs/ESTADO.md), [probar y compilar](docs/BETA-1.md). Los paquetes de la [entrega anterior](https://github.com/webr0m/rigthnder/releases/tag/v1.0.0-beta.1.1) no incluyen estos cambios.

**Sin swipes. Solo conversación.** Comunidad de citas para mayores de 18 años: feed vertical, perfiles con referentes, chat directo y citas aceptadas por ambas personas. Rediseño de Rigthnder a partir de los mockups claro/oscuro aportados por el usuario. MIT.

Web: **https://onlyfachos.webrom.cc**. Las nuevas compilaciones móviles usan este dominio; el dominio .lat anterior ya no se usa como API predeterminada. Los repositorios y el identificador móvil se conservan.

Interfaz en español, inglés y alemán: selector antes y durante el registro y en Ajustes. Se guardan idioma y apariencia en la cuenta. Los mensajes, biografías, nombres y etiquetas personales mantienen su texto original.

## Probar

Node.js 24 LTS (mínimo 22.13), pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Abre http://localhost:3000 para la portada, `/demo` para la demo directa y `/app` para el acceso existente. Para desarrollar: `pnpm dev`, interfaz en http://localhost:5173 y API en 3000. Si otro proyecto ocupa 3000, configura `PORT=3100` y `API_PROXY_URL=http://127.0.0.1:3100` antes de ejecutar el comando.

## Cómo funciona

1. **Crear perfil:** correo/contraseña o Google configurado, después tres pasos. Dos a seis fotos propias, datos básicos y bio; referentes y afinidad política opcionales; expectativas, idiomas y viajes. Política, religión y referentes requieren consentimiento explícito. Desmarcarlo limpia esos campos antes de guardar.
2. **Scrollear:** perfiles completos en una lista vertical. No hay tarjetas que se descarten, likes ni swipes en la interfaz. Se cargan más perfiles al acercarse al final y también mediante un botón accesible. Navegar al chat y volver conserva la posición del feed.
3. **Encontrar:** «Para ti» ordena por coincidencias declaradas; «En línea» usa actividad en los últimos tres minutos; «Ven lo mismo» exige referentes compartidos; «Cerca» compara la ciudad declarada, sin GPS. Hay búsqueda por nombre/ciudad/ocupación y filtros de edad y género. No se infieren afinidades de fotos, nacionalidad o religión.
4. **Conversar:** «Escribir» abre un chat directo sin match previo. Hay texto, fotos comprimidas, stickers, reacciones y grabación de voz de hasta 60 segundos en navegadores compatibles, con permiso al micrófono. Fotos y audio se validan y persisten. El chat actualiza mensajes periódicamente.
5. **Proponer:** la racha cuenta días consecutivos en que ambos escribieron (calendario de Chile). Desde tres días se sugiere invitar o dar luz verde. También se puede hacer antes desde el encabezado. Una señal expresa interés; nunca inventa disponibilidad ni acepta por la persona.
6. **Quedar:** quien propone ya expresa su consentimiento. Solo la otra persona puede aceptar o rechazar. Se confirma la cita cuando acepta; ambos pueden coordinar día, hora y lugar en el chat. Rechazar conserva la conversación. Usuarios externos no pueden ver ni responder invitaciones.
7. **Controlar:** bloquear y denunciar desde cualquier perfil/chat; editar el perfil, descargar datos o eliminar la cuenta desde «Perfil». El bloqueo retira la conversación y sus registros asociados.

La recuperación por correo está en «Inicia sesión → Olvidé mi contraseña». El enlace vence en 30 minutos y cierra las sesiones anteriores al cambiar la contraseña. [Configurar el envío](docs/RECUPERACION.md).

## Demo y límites

La web pública es una portada promocional de una sola página, con imagen panorámica animada y ambas tiendas como «Próximamente». El botón «Explorar la demo» abre `/demo` directamente sin registrarse. Sus perfiles, información política y religiosa, fotos ilustrativas y respuestas son ficticios; no atribuyen opiniones a las personas fotografiadas. Cada visitante tiene una sesión separada y las cuentas reales nunca ven la demo. Incluye una conversación ficticia de tres días y botones explícitos para simular aceptación/rechazo. Los contadores provienen de esos registros, no son cifras comerciales inventadas.

Los modos claro y oscuro se cambian con el sol/luna; se guarda únicamente la preferencia de apariencia en el navegador. En producción la demo requiere `DEMO_ENABLED=true`.

Apple, GIFs y PRO no están habilitados; no hay cobros ni suscripciones. Google requiere credenciales OAuth privadas y puede vincularse desde Perfil → Ajustes tras confirmar la contraseña. AdMob se incluye con anuncios de prueba en las nuevas compilaciones nativas; el SDK espera a que UMP permita solicitar anuncios. No hay anuncios web ni se envían perfiles u opiniones a anunciantes. Push necesita configuración del servidor y autorización de cada dispositivo; consulta [notificaciones](docs/PUSH.md). La publicación real y las compilaciones de Play se detallan en [Estado](docs/ESTADO.md).

Este MVP todavía requiere moderación operativa, verificación del correo, límites de abuso a escala, contacto y políticas definitivas del operador, respaldos y pruebas de dispositivos para un lanzamiento abierto. La edad es declarada y los mensajes no tienen cifrado de extremo a extremo. [Operación](docs/OPERACION.md).

## Configuración y colaboración

- Copia `.env.example` a `.env`. Secretos solo en el servidor; las variables `VITE_*` son públicas.
- [Recuperación por correo](docs/RECUPERACION.md), [Google](docs/GOOGLE.md), [móvil y AdMob](docs/MOVIL-Y-ADMOB.md), [Namecheap y Cloudflare](docs/DESPLIEGUE.md).
- [Diseñar con un amigo](docs/DISENO.md), [contribuir](CONTRIBUTING.md), [créditos](docs/CREDITOS.md).
- GitHub principal: https://github.com/webr0m/rigthnder. GitLab: https://gitlab.com/ridrogo/rigthnder. Sincronizar con pushes normales; no hay espejo automático.

## Verificación y migración

```sh
pnpm check
pnpm test
pnpm build
```

Las pruebas cubren cuentas, edad, OAuth simulado y vinculación sin duplicados, recuperación, sesiones y respuestas atrasadas, privacidad, chat, citas bilaterales, bloqueo, archivos, feed, anuncios/consentimiento y revocación/reintentos de push. El paquete Node se prueba sin node_modules para verificar sus dependencias incluidas. La grabación y los SDK móviles aún requieren pruebas en teléfonos físicos.

La migración SQLite es aditiva y conserva usuarios y mensajes. La tabla histórica `matches` almacena las conversaciones; `date_invitations` representa las citas. Los endpoints `/api/swipes` y `/api/matches` permanecen como compatibilidad técnica y no se usan en la interfaz nueva. Antes de desplegar, crea un respaldo consistente de SQLite y conserva `.env` y el directorio de datos fuera del paquete.

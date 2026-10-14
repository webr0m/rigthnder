# Rigthnder 🖤

**El amor también va a la derecha.** App de citas para mayores de 18 años, con una identidad negra y dorada y conexiones basadas en valores compartidos.

Primera versión funcional para pruebas: React + Node.js/Express + SQLite, con proyectos Android/iOS mediante Capacitor, acceso con Google y adaptación de AdMob. Licencia MIT. El código abierto no incluye datos de usuarios, credenciales ni claves de firma.

## Probar en 3 pasos

Instala [Node.js 24 LTS](https://nodejs.org/) (mínimo 22.13) y [pnpm](https://pnpm.io/installation). También puedes usar npm, incluido en la instalación habitual de Node.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Abre **http://localhost:3000**. La demo se abre automáticamente en desarrollo. Sus perfiles son ficticios, las fotos son ilustrativas y las respuestas del chat se simulan; cada visitante tiene una sesión independiente. Las cuentas reales nunca ven perfiles de demo.

Para desarrollar con recarga automática:

```sh
pnpm dev
```

Interfaz en http://localhost:5173; API en el puerto 3000. En este equipo, si npm/pnpm no están en PATH, la versión ya construida arranca con `node server/index.mjs`.

## Qué funciona

- Likes, pasar, superlikes, deshacer la última reacción sin match y gesto de deslizamiento.
- Filtros por edad, ciudad, género y valores; orden por número de valores compartidos.
- Matches mutuos, chat persistente y actualización periódica de mensajes.
- Registro por correo, contraseña con scrypt, sesión HttpOnly y Google OAuth con registro posterior para confirmar edad y consentimiento.
- Edición del perfil, foto local comprimida, intereses, intención y pregunta para romper el hielo.
- Denuncias, bloqueo bilateral, exportación de datos y eliminación de cuenta con borrado de registros asociados.
- Navegación móvil, diseño adaptable, teclado, foco en modales y movimiento reducido.

## Configuración

Copia `.env.example` a `.env`. Los secretos de Google solo van en el servidor; las variables `VITE_*` son públicas y se incluyen al compilar. Nunca pongas secretos en ellas.

La base queda en `data/rigthnder.sqlite`. Para conservar usuarios al desplegar, configura una ruta persistente fuera de la carpeta pública. Se puede abrir desde dos navegadores con cuentas reales para probar un match y el chat.

En producción (`NODE_ENV=production`) la demo está desactivada por defecto. Actívala con `DEMO_ENABLED=true` si vas a mostrar la versión de prueba. Configura `PUBLIC_URL`, `ALLOWED_ORIGINS` y HTTPS antes de usar cuentas reales.

## Google, móvil y monetización

- [Activar Google](docs/GOOGLE.md)
- [Android, iOS y AdMob](docs/MOVIL-Y-ADMOB.md)
- [Namecheap, Cloudflare y despliegue](docs/DESPLIEGUE.md)

Google está implementado, pero necesita tu cliente OAuth para funcionar. AdMob usa IDs de Google de prueba, se activa solo por acción del usuario en una app nativa y solicita consentimiento antes de cargar anuncios no personalizados. No hay publicidad en la web. Rigthnder Plus es una propuesta futura: esta versión no cobra ni activa suscripciones.

## Diseñar con un amigo

[Archivo de Figma](https://www.figma.com/design/4c41jvZDxF8wAk5gc2P7yQ?node-id=2-2), [guía de diseño](docs/DISENO.md), [contribuir](CONTRIBUTING.md). Colores en `src/tokens.css`; interfaz en `src/App.jsx`; estilos en `src/styles.css`.

El archivo de Figma contiene la captura de la pantalla web. El plan Starter alcanzó el límite de llamadas durante su preparación; no se terminó la biblioteca de componentes reutilizables. La guía explica cómo continuarla sin perder la identidad.

## Calidad y límites

```sh
pnpm check
pnpm test
pnpm build
```

Las pruebas cubren acceso, edad, aislamiento de demo, matches, mensajes, bloqueos, filtros, borrado y OAuth simulado. La autenticación real de Google, los SDK publicitarios y las compilaciones de tiendas requieren sus cuentas, credenciales y dispositivos.

Esta versión sirve para probar el producto; para un lanzamiento público faltan verificación de correo/recuperación de contraseña, moderación operativa y revisión de contenido, protección contra abuso a escala, contacto y políticas definitivas del operador, respaldos y sus plazos de borrado, notificaciones push y pruebas de dispositivos. Los mensajes están guardados en el servidor; no hay cifrado de extremo a extremo. La edad se declara; no hay verificación documental. Consulta [operación y seguridad](docs/OPERACION.md).

## Repositorios

GitHub principal: `https://github.com/webr0m/rigthnder`. GitLab público: `https://gitlab.com/ridrogo/rigthnder`. Para publicar el mismo historial en ambos, configura remotos `origin` y `gitlab` y usa `git push origin main` / `git push gitlab main`; evita force-push y los espejos destructivos. Si el repo de GitLab no está creado, `node scripts/publish-gitlab.mjs` utiliza una credencial ya guardada para esa cuenta y lo crea sin imprimirla.

Fotos de muestra y tipografía tienen sus propias condiciones: [créditos](docs/CREDITOS.md).

Web publicada: **https://rigthnder.webrom.lat**. Consulta [estado y pendientes](docs/ESTADO.md) para distinguir lo publicado de las integraciones que aún requieren configuración.

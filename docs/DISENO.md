# OnlyFachos · Guía para colaborar en diseño

La referencia actual del nuevo menú son «OnlyFachos-Nuevas-Pantallas-Modo-Claro.pdf» y «OnlyFachos-Nuevas-Pantallas-Modo-Oscuro.pdf». El feed mantiene los mockups iniciales y el scroll único aprobado. El nombre aprobado es **OnlyFachos**, con O y sin cambiar el dominio existente. No incluir los PDF ni sus retratos en el repositorio público sin autorización de sus autores.

## Dirección visual

- Negro `#0d0d11`, amarillo `#ffda00`, rojo `#ff343c`. Modo claro con fondo papel `#f2efe6`.
- Anton para titulares condensados; Manrope para formularios, conversación y lectura. Fuentes locales con OFL.
- Marca ONLY + FACHOS en una franja amarilla inclinada. Botones con contorno oscuro y sombra corta; rojo reservado para alerta y confirmación de cita.
- En móvil: encabezado compacto, feed vertical completo y navegación Comunidad / Chats / Perfil. En escritorio, adaptar con navegación lateral y explicación del flujo sin comprimir el feed.
- La pantalla 5 define el feed móvil: marca y campana → buscador → filtros horizontales → personas en línea → tarjetas completas. Todo forma parte del scroll del documento; solo la navegación inferior queda fija. No usar carruseles verticales, scroll por tarjeta, pantallas por perfil ni scroll-snap.
- Mantener las proporciones de las fotos, los seis datos en casillas y los referentes visibles. Al tocar una persona conectada se desplaza hasta su tarjeta; al volver de «Escribir» se restaura el punto del feed, sin filtrarlo ni reiniciarlo.

## El recorrido que se debe respetar

Registro → perfil en tres pasos → comunidad por scrolling → chat directo → señal/invitación → respuesta de la otra persona → cita → coordinación en chat.

El scroll no vota ni descarta perfiles. El chat no requiere likes. El match significa aceptación bilateral de una cita. No mostrar personas reales como disponibles si no están activas ni inventar mensajes, rachas o afinidades. «Cerca» significa misma ciudad declarada.

Política, religión y referentes son voluntarios y visibles solo al elegirlos y consentir. No asignar opiniones a usuarios reales; los ejemplos siempre deben identificarse como ficticios. Cualquiera puede invitar o dar luz verde, sin roles impuestos por género.

## Reparto sugerido con tu amigo

1. Acceso y registro: estados vacío, error, cargando, fotos y consentimiento.
2. Feed: cards, galería, chips, hechos y filtros, con texto largo y sin datos opcionales.
3. Chat: burbujas, audio/foto, stickers, foco/teclado y opciones de seguridad.
4. Cita: invitación pendiente, aceptación, rechazo, señal voluntaria y coordinación.

Tu amigo puede proponer cambios en Figma y adjuntar el frame a un issue. Para contribuir código, una rama `design/tema` y un pull request. Invítalo con su cuenta; no compartan contraseñas. El [archivo de Figma anterior](https://www.figma.com/design/4c41jvZDxF8wAk5gc2P7yQ?node-id=2-2) contiene la versión Rigthnder; no refleja este rediseño. Su biblioteca no se terminó por el límite Starter.

## Archivos de trabajo

| Archivo | Uso |
| --- | --- |
| `src/tokens.css` | Temas claro/oscuro y tipografía |
| `src/styles.css` | Layout y responsive |
| `src/mobile-feed.css` | Feed móvil one page y navegación inferior, siguiendo la pantalla 5 |
| `src/App.jsx` | Feed, acceso y navegación |
| `src/Onboarding.jsx` | Registro y edición en tres pasos |
| `src/BetaPages.jsx` | Perfil completo, Mi perfil, ajustes, filtros, soporte/PRO/verificación |
| `src/DatePlanner.jsx` | Propuesta en dos pasos y cita confirmada |
| `src/beta.css` | Pantallas nuevas y temas |
| `src/Conversations.jsx` | Chat, señales y citas |
| `src/Shared.jsx` | Controles, modales, bloqueo y textos |

Revisar 390 px, 320 px, escritorio, navegación por teclado, fotos ausentes, bios largas, zoom, ambos temas y estados sin resultados. Los modales deben contener el foco y devolverlo al cerrar. No activar botones de Apple, GIFs o pagos como si estuvieran integrados.

## Portada pública de una sola página

La portada vive en `src/Marketing.jsx` y `src/marketing.css`; imágenes en `public/marketing/`. La app de muestra está en `/demo` y la experiencia existente en `/app`. Conservar el aviso Próximamente de ambas tiendas hasta tener enlaces públicos confirmados. Animaciones pausables y movimiento reducido; no usar cifras, testimonios ni perfiles reales como contenido de promoción sin autorización.

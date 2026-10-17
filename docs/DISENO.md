# OnlyFachos · Guía para colaborar en diseño

La referencia actual son los dos PDF «OnlyFachas Modo Claro» y «OnlyFachas Modo Oscuro», proporcionados por el usuario el 16 de octubre de 2026. El nombre aprobado es **OnlyFachos**, con O y sin cambiar el dominio existente. No incluir los PDF ni sus retratos en el repositorio público sin autorización de sus autores.

## Dirección visual

- Negro `#0d0d11`, amarillo `#ffda00`, rojo `#ff343c`. Modo claro con fondo papel `#f2efe6`.
- Anton para titulares condensados; Manrope para formularios, conversación y lectura. Fuentes locales con OFL.
- Marca ONLY + FACHOS en una franja amarilla inclinada. Botones con contorno oscuro y sombra corta; rojo reservado para alerta y confirmación de cita.
- En móvil: encabezado compacto, feed vertical completo y navegación Comunidad / Chats / Perfil. En escritorio, adaptar con navegación lateral y explicación del flujo sin comprimir el feed.

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
| `src/App.jsx` | Feed, acceso y navegación |
| `src/Onboarding.jsx` | Registro y edición en tres pasos |
| `src/Conversations.jsx` | Chat, señales y citas |
| `src/Shared.jsx` | Controles, modales, bloqueo y textos |

Revisar 390 px, 320 px, escritorio, navegación por teclado, fotos ausentes, bios largas, zoom, ambos temas y estados sin resultados. Los modales deben contener el foco y devolverlo al cerrar. No activar botones de Apple, GIFs o pagos como si estuvieran integrados.

# Diseño colaborativo · Rigthnder

Nombre definitivo: **Rigthnder**. Mantener la escritura exacta; no autocorregir a Rightnder. Lema: **El amor también va a la derecha.** Voz cercana, inteligente y con humor ligero. La identidad alude a la derecha política mediante libertad, familia, tradición, emprendimiento, responsabilidad y patria; sin ataques, caricaturas de adversarios ni promesas de compatibilidad científica.

Figma: https://www.figma.com/design/4c41jvZDxF8wAk5gc2P7yQ?node-id=2-2

La captura inicial permite revisar la composición. La biblioteca de componentes no pudo terminarse por el límite del plan Starter. Continuar con capas de texto, fotos individuales, Auto Layout y componentes; no usar una captura completa como fondo de una pantalla.

## Marca

| Token CSS          | Color     | Función                    |
| ------------------ | --------- | -------------------------- |
| `--bg`             | `#111111` | Fondo negro                |
| `--sidebar`        | `#141414` | Navegación                 |
| `--surface`        | `#1B1B1B` | Tarjetas                   |
| `--surface-raised` | `#242424` | Superficie secundaria      |
| `--gold`           | `#F4C44E` | Acción principal y acentos |
| `--gold-hover`     | `#FFDA7A` | Hover                      |
| `--gold-subtle`    | `#302A1C` | Fondo de selección         |
| `--text`           | `#F3F1EB` | Texto principal            |
| `--muted`          | `#AAA7A0` | Texto secundario           |
| `--border`         | `#30302E` | Contornos                  |

Tipografía **Manrope**, alojada localmente, licencia OFL. Titulares 40–48 px en descubrimiento, cuerpo legible y acciones claras. Radios: 8 px en botones, 18 px en tarjetas, redondo en likes. No depender únicamente del color para informar selección, éxito o error.

## Siguiente trabajo en Figma

1. Variables semánticas con nombres de CSS; un modo oscuro.
2. Componentes Button (normal/hover/deshabilitado), Tag (normal/compartido), navegación (normal/activa), Avatar, ProfileCard y campo de formulario.
3. Frames 1366 × 920 y 390 × 844. Adaptar layouts; no reducir la pantalla de escritorio proporcionalmente.
4. Pantallas: Descubrir, Match, Conversación, Editar perfil y Acceso con Google.
5. Estados: carga, sin perfiles, sin matches, error, denuncia guardada, bloqueo y borrado confirmado.

Los estilos en CSS son la fuente actual. Si Figma cambia un valor, documentarlo en el issue y actualizar el token correspondiente. Antes de mezclar, comparar el frame y la web.

## Brief para tu amigo

“Ayúdame a mejorar Rigthnder, una app de citas para mayores de 18 años con valores de derecha. Mantén negro y amarillo dorado, Manrope y un tono respetuoso. Trabaja en propuestas para móvil, onboarding y chat. Usa Auto Layout, estados claros, acciones de al menos 44 px y perfiles ficticios. Deja tus propuestas en frames separados y comentarios con el comportamiento esperado.”

## Criterios de revisión

- Navegación inferior usable con una mano en móviles; área segura respetada.
- Texto largo, nombres largos y fotos ausentes sin romper el layout.
- Foco visible, etiquetas para iconos y uso con teclado.
- Valores compartidos contados realmente, sin porcentajes inventados.
- Google se entiende como acceso; la edad y el consentimiento se piden aparte.
- Demo, funcionalidades futuras y anuncios de prueba identificados.
- Bloqueo y denuncia localizables desde perfil y chat.

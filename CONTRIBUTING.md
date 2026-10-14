# Colaborar en Rigthnder

Puedes colaborar en diseño sin tocar el backend. El dueño invita a su amigo al archivo de Figma con permiso de edición; para aportar código, agrega al colaborador en GitHub (Settings → Collaborators) o GitLab (Manage → Members). No compartan contraseñas ni tokens. No se han enviado invitaciones automáticamente.

1. Lean `docs/DISENO.md` y abran Figma.
2. Elijan una tarea pequeña: onboarding, tarjetas, chat, estados vacíos o iconografía.
3. Antes de modificar una pantalla aprobada, dupliquen su frame y nombren la propuesta `Propuesta / autor / fecha`.
4. Añadan comentarios con motivos, tamaños, comportamientos y estados; usen perfiles ficticios.
5. Abran un issue con el enlace exacto al frame. Para código, creen una rama `design/nombre-de-la-tarea` y un pull/merge request.
6. Comprueben escritorio, 390 px, teclado, contraste y texto largo. Ejecuten build; si el cambio toca lógica, ejecuten también las pruebas.

```sh
git clone https://github.com/webr0m/rigthnder.git
cd rigthnder
pnpm install --frozen-lockfile
git switch -c design/mejorar-onboarding
pnpm dev
```

GitHub es el origen principal. Sincronicen `main` a GitLab después de cada merge, con un push normal. Si aparecen commits distintos en GitLab, reconcílienlos antes de volver a sincronizar; no sobrescriban trabajo ajeno.

## Dónde trabajar

| Archivo           | Uso                                   |
| ----------------- | ------------------------------------- |
| `src/tokens.css`  | Colores, tipografía y radios de marca |
| `src/styles.css`  | Layout, responsive y estados visuales |
| `src/App.jsx`     | Pantallas y componentes               |
| `public/icon.svg` | Símbolo de marca                      |
| `docs/DISENO.md`  | Brief compartido                      |

La licencia MIT cubre las contribuciones al software. Usen solo recursos que puedan redistribuirse y documenten licencias externas.

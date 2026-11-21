# Auditoría · 21 de noviembre de 2026

Versión preparada: `1.0.0-beta.1.11`, Android `10015`. Revisión del árbol local, incluidas las funciones de verificación, contraseña y moderación que estaban sin publicar. El estado inicial se preservó en un parche privado antes de editar. Los datos de las pruebas son ficticios y la base de QA está en memoria.

## Fallos corregidos

- **Google web:** la recuperación del registro solo buscaba tickets nativos e ignoraba la cookie HttpOnly del navegador. Se consulta el registro pendiente cuando se vuelve de Google o existe un borrador; los accesos anónimos nuevos no generan consultas innecesarias. Un borrador vencido permite revalidar sin reiniciar el formulario.
- **Migración de cuentas:** exigir verificación a cualquier correo sin fecha de confirmación habría bloqueado las cuentas existentes. El requisito se almacena por cuenta; las anteriores conservan acceso sin inventar confirmaciones y los registros pendientes de una versión intermedia mantienen su obligación de verificar.
- **Clientes anteriores:** una app instalada que espera token tras cualquier respuesta 201 no recibe una falsa sesión al crear una cuenta pendiente. Se muestra una indicación para confirmar el correo y luego entrar. La beta nueva incorpora la pantalla de activación.
- **Verificación:** enlaces de un solo uso por 24 horas, texto del correo corregido, misma respuesta y contadores para direcciones conocidas y desconocidas, enfriamiento y cupo diario. La caída del transporte no permite saltarse el requisito. Ruta con barra final y reintento ante errores transitorios.
- **Sesiones y contraseñas:** se revalida la cuenta antes de emitir sesiones, incluido Google. Un cambio concurrente de contraseña no sobrescribe otro cambio ni una recuperación; se comprueba que la sesión siga vigente y se revocan las otras sesiones y vinculaciones pendientes.
- **Moderación:** entradas inválidas devuelven 400, un moderador no sanciona a sus pares ni administradores, y las suspensiones vencen sin exigir que la persona afectada vuelva a iniciar sesión. Los perfiles y chats restringidos quedan fuera de los listados; no se encolan avisos de remitentes restringidos. Una restricción invalida el acceso local, sin confundirla con un error de permisos normal.
- **Panel:** errores de carga visibles con reintento, paginación de denuncias y descarte de respuestas antiguas al cambiar filtros o selección. No se asignaron roles a cuentas reales.
- **Privacidad:** al eliminar una cuenta se anonimizan sus referencias, notas y metadatos del historial administrativo conservado.
- **Push web:** tocar una notificación desde una pestaña de la portada ahora abre la app y los chats; la portada no tenía el receptor de mensajes de la app. Se conserva una app ya abierta y se evita reutilizar la demo.
- **Citas:** una propuesta que ya venció no puede confirmarse; puede rechazarse. Se conserva la sincronización entre invitación y propuesta confirmada.

## Validación

- Comprobaciones sintácticas, suite automatizada y compilaciones web/servidor: resultados finales en el estado de distribución.
- `pnpm audit --prod`: cero vulnerabilidades conocidas en 103 dependencias consultadas el 21 de noviembre. No garantiza ausencia de todo riesgo.
- Regresiones para migración de una base intermedia y reapertura, compatibilidad de clientes anteriores, correo de un solo uso, perfiles pendientes ocultos, concurrencia de contraseña, permisos de moderación, expiración y anonimización.
- QA visual local: retorno de Google abre el registro, borrador conservado al recargar, confirmación de correo en alemán recuperable tras un 503 simulado, acceso con contraseña, panel recuperable y segunda página de denuncias.
- Se conserva el límite de tiempo de arranque y los proxies nativos fuera de funciones async para evitar el bloqueo ya corregido en beta 1.10.

## Despliegue y límites

Antes de reemplazar archivos: respaldo coherente de SQLite y de la configuración privada, ensayo de migración sobre una copia, comprobación de integridad y conservación de cuentas. Se utiliza la misma base activa; no se reemplaza por una base vacía. Secretos OAuth/FCM/SMTP permanecen privados.

La comprobación de OAuth usa un proveedor simulado en QA; no certifica el acceso con todas las cuentas Google reales. La entrega de correo nuevo a cada proveedor y el comportamiento de teléfonos físicos requieren comprobación adicional. Las advertencias de Play sobre bibliotecas del proveedor y borde a borde no equivalen a un fallo reproducido de arranque. iOS requiere firma y configuración APNs para distribuirse.

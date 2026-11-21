# Operación antes del lanzamiento público

Esta versión es un MVP para pruebas. No afirmar que tiene identidad verificada, moderación automática, cifrado de extremo a extremo o suscripciones funcionando.

El operador debe publicar su identidad y contacto de soporte/privacidad, adaptar términos y privacidad a los países donde opera, definir consentimiento para datos que puedan revelar opiniones políticas y revisar sus procedimientos antes de captar usuarios reales.

## Moderación

El panel privado está en `/moderation` y solo acepta cuentas con `moderation_role` `moderator` o `admin`. La primera cuenta autorizada se habilita desde el servidor privado, sin publicar credenciales:

```sh
DATABASE_PATH=./data/rigthnder.sqlite pnpm moderation -- grant correo-del-operador@example.com moderator
```

Las denuncias usan `pending`, `reviewing`, `resolved` y `dismissed`. Cada cambio exige un motivo y crea una entrada en `moderation_audit` con actor, objetivo, transición y fecha. Desde el panel se puede revisar, resolver, descartar, suspender 72 horas, bloquear o restaurar una cuenta. Suspender o bloquear revoca sus sesiones y dispositivos push. No se puede cambiar el estado de la propia cuenta ni bloquear a otro administrador desde una cuenta de moderador.

Las API `/api/moderation/*` requieren sesión autorizada, origen permitido y, para cambios, una petición de navegador con `Origin` válido. La interfaz no sustituye la autorización del servidor. Los reportes se muestran paginados y excluyen cuentas demo.

Las denuncias se guardan en la tabla `reports`. El bloqueo de usuario se aplica también a login, feed, conversaciones y mensajes. Mantén revisión de contenido, tiempos de respuesta, mecanismos contra explotación de menores y el contacto exigido por las tiendas.

## Acceso y datos

Contraseñas con scrypt y salt independiente; sesiones con token aleatorio de 256 bits y solo su hash almacenado; cookie HttpOnly, SameSite Lax y Secure en producción. Las sesiones recordadas duran hasta 30 días y las temporales hasta 12 horas. Cambiar la contraseña conserva solo la sesión actual y revoca las anteriores. Peticiones de escritura rechazan orígenes no autorizados. No confíes en cabeceras de proxy si no controlas el proxy.

Fotos comprimidas en el navegador y validadas por formato, firma de archivo y límite de tamaño; guardadas en SQLite para esta fase. Los textos se renderizan como texto de React, sin HTML arbitrario. No se recoge geolocalización precisa. El correo y cumpleaños no están en perfiles públicos.

Configura HTTPS y limita acceso a la base. Los mensajes no tienen cifrado de extremo a extremo y administradores con acceso a la base pueden leerlos. Para escalar, migrar a PostgreSQL, almacenamiento privado para fotos, colas y límites distribuidos. Esta SQLite corresponde a una sola instancia; no lanzar varias réplicas con bases independientes.

La verificación de correo está implementada para cuentas de correo/contraseña: el enlace es de un solo uso, vence en 24 horas, se almacena solo como hash y no crea una sesión al confirmarlo. El login permanece bloqueado hasta confirmar; el reenvío no revela si el correo existe y tiene límites por dirección. Google se considera verificado. Configura y prueba el transporte antes del lanzamiento; consulta [Verificación de correo](VERIFICACION.md) y [Recuperación](RECUPERACION.md). No se permite a un registro Google vincular automáticamente una cuenta ya registrada con contraseña.

## Borrado y copias

Eliminar cuenta borra usuarios y datos relacionados por cascada en la base activa. Documenta plazos y elimina también los respaldos según tu política. No copies una SQLite abierta sin su WAL: usa la API de backup de SQLite o una copia consistente con el proceso detenido. Nunca añadas `data/`, `.env` ni exportaciones de usuarios a Git.

Las demos generan sesiones independientes. Si se muestran al público durante una prueba prolongada, implementar limpieza programada de usuarios demo expirados para evitar crecimiento de la base. No conservar datos de demostración indefinidamente.

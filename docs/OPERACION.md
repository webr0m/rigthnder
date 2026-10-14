# Operación antes del lanzamiento público

Esta versión es un MVP para pruebas. No afirmar que tiene identidad verificada, moderación automática, cifrado de extremo a extremo o suscripciones funcionando.

El operador debe publicar su identidad y contacto de soporte/privacidad, adaptar términos y privacidad a los países donde opera, definir consentimiento para datos que puedan revelar opiniones políticas y revisar sus procedimientos antes de captar usuarios reales.

## Moderación

Las denuncias se guardan en la tabla `reports` con estado `pending`. No se envían mensajes a un equipo externo ni hay un panel de administración público. Revisa la base por un acceso administrativo protegido y lleva un registro de resolución. El bloqueo se aplica en ambos sentidos a descubrimiento y chat y elimina el match asociado. Implementa revisión de contenido, tiempos de respuesta, mecanismos contra explotación de menores y el contacto exigido por las tiendas.

## Acceso y datos

Contraseñas con scrypt y salt independiente; sesiones con token aleatorio de 256 bits y solo su hash almacenado; cookie HttpOnly, SameSite Lax y Secure en producción. Sesiones expiran en 7 días. Peticiones de escritura rechazan orígenes no autorizados. No confíes en cabeceras de proxy si no controlas el proxy.

Fotos comprimidas en el navegador y validadas por formato, firma de archivo y límite de tamaño; guardadas en SQLite para esta fase. Los textos se renderizan como texto de React, sin HTML arbitrario. No se recoge geolocalización precisa. El correo y cumpleaños no están en perfiles públicos.

Configura HTTPS y limita acceso a la base. Los mensajes no tienen cifrado de extremo a extremo y administradores con acceso a la base pueden leerlos. Para escalar, migrar a PostgreSQL, almacenamiento privado para fotos, colas y límites distribuidos. Esta SQLite corresponde a una sola instancia; no lanzar varias réplicas con bases independientes.

Añadir verificación de correo y recuperación de contraseña antes del lanzamiento. No se permite a un registro Google vincular automáticamente una cuenta ya registrada con contraseña.

## Borrado y copias

Eliminar cuenta borra usuarios y datos relacionados por cascada en la base activa. Documenta plazos y elimina también los respaldos según tu política. No copies una SQLite abierta sin su WAL: usa la API de backup de SQLite o una copia consistente con el proceso detenido. Nunca añadas `data/`, `.env` ni exportaciones de usuarios a Git.

Las demos generan sesiones independientes. Si se muestran al público durante una prueba prolongada, implementar limpieza programada de usuarios demo expirados para evitar crecimiento de la base. No conservar datos de demostración indefinidamente.

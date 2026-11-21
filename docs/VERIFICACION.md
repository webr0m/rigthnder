# Verificación de correo

Las nuevas cuentas creadas con correo y contraseña, cuando el transporte de correo está configurado, deben confirmar su dirección antes de iniciar sesión. Las cuentas anteriores conservan su acceso sin obtener una insignia de correo verificado. Las cuentas creadas o vinculadas mediante Google se consideran verificadas porque Google ya validó el correo de la cuenta.

## Flujo

Después del registro se muestra la pantalla de activación y no se crea una sesión. La persona puede pedir el reenvío desde «Inicia sesión»; la respuesta es igual para correos conocidos y desconocidos. El enlace abre `/verificar-correo#token=...&lang=...`, se procesa por `POST` y no inicia sesión automáticamente: después de confirmar, la persona vuelve al acceso y usa su contraseña.

Los tokens son aleatorios, se almacenan solo como SHA-256, caducan en 24 horas y se consumen una sola vez. Se conserva únicamente el token del fragmento del navegador, no en la ruta ni en consultas HTTP. El reenvío limita a un correo cada 15 minutos y hasta cinco solicitudes por ventana de 24 horas. Si el transporte falla, el token no entregado se invalida.

## Configuración

La verificación reutiliza el transporte descrito en [Recuperación de contraseña](RECUPERACION.md). El backend activa el requisito para las cuentas nuevas cuando el mailer expone `sendVerification`; una cuenta ya marcada como pendiente sigue bloqueada aunque el transporte deje de estar disponible. sin un transporte configurado, la aplicación conserva el comportamiento de las instalaciones de pruebas existentes y no debe anunciarse como verificación activa.

Configura `PUBLIC_URL` con HTTPS y un remitente autorizado. Los secretos de SMTP o del sistema de correo permanecen únicamente en `.env` del servidor; nunca se usan variables `VITE_*`, assets públicos, Git, capturas o logs para transportarlos.

## Antes de publicar

- Verifica entrega real y SPF/DKIM/DMARC del remitente sin incluir credenciales en pruebas o reportes.
- Comprueba registro, login bloqueado, reenvío genérico, enlace expirado, reutilización y recuperación de contraseña.
- Confirma que Google puede entrar y que confirmar un correo no crea una sesión.
- Respalda SQLite antes de migrar; las tablas `email_verifications` y `email_verification_requests` se crean de forma aditiva.

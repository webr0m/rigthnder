# Recuperación de contraseña

En «Inicia sesión → Olvidé mi contraseña», la persona introduce su correo. Recibe un enlace para elegir y confirmar una contraseña de 10 a 128 caracteres. El enlace abre la web, también desde un teléfono, en el idioma elegido (español, inglés o alemán). Las cuentas que usan exclusivamente Google continúan con Google.

El remitente debe pertenecer a un dominio autorizado en el servidor. Configura únicamente en el `.env` privado del backend:

```dotenv
PUBLIC_URL=https://onlyfachos.webrom.cc
MAIL_TRANSPORT=sendmail
MAIL_FROM=admin@webrom.cc
SENDMAIL_PATH=/sbin/sendmail
```

La instalación de Namecheap usa el servicio local Exim y el buzón existente del dominio, sin guardar una nueva contraseña SMTP. En otro proveedor puedes usar `MAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS`; se exige TLS. El puerto 465 usa TLS directo y el 587 STARTTLS. Nunca pongas secretos en variables `VITE_*` ni en Git. Conserva SPF y DKIM válidos para el remitente. Si no hay transporte configurado, la API devuelve indisponibilidad para cualquier cuenta.

Los enlaces vencen en 30 minutos. La base guarda únicamente su SHA-256 y un vínculo con las credenciales vigentes; no guarda el token ni la contraseña en claro. El token viaja en el fragmento del enlace y se envía por POST al confirmar; no aparece en la ruta, consultas o registros HTTP de acceso. Abrir el enlace no lo consume. La confirmación comprueba de nuevo la validez en una transacción: cambia el hash scrypt, elimina los enlaces de esa cuenta y revoca todas sus sesiones. La persona debe iniciar sesión de nuevo.

La respuesta no revela si existe el correo. El envío se realiza sin esperar al servidor de correo y la respuesta tiene una espera común. Se aplican límites por IP, una pausa de un minuto entre correos a la misma dirección y hasta cinco envíos por hora por dirección. Los fallos de transporte se registran sin correos ni tokens y se invalidan los enlaces no entregados. Enviar desde Exim confirma la aceptación local; la llegada a la bandeja de entrada depende del servidor del destinatario.

Antes de desplegar, respalda SQLite y `.env`. Las tablas `password_resets` y `password_reset_requests` se crean con una migración aditiva. No se recrean cuentas ni mensajes. Las pruebas usan bases en memoria y transporte simulado; no cambian credenciales de usuarios reales.

# Inicio de sesión en beta 1.6

En acceso y registro se puede elegir «Mantener mi sesión en este dispositivo» (activado inicialmente). Con la opción activa, la sesión dura hasta 30 días; sin ella, la cookie web es de sesión y el servidor limita el acceso a 12 horas. Algunos navegadores restauran cookies de sesión al recuperar ventanas: en equipos compartidos se debe cerrar sesión explícitamente.

La web usa una cookie HttpOnly, Secure en producción y SameSite=Lax. Android e iOS usan un token en almacenamiento cifrado del sistema (Keystore/Keychain, sin sincronización iCloud); sin recordar, el token solo vive en memoria. Las peticiones nativas omiten cookies para respetar esa elección. Nunca se guarda la contraseña en el dispositivo.

La preferencia también se conserva durante OAuth de Google, ligada al estado validado por el servidor. Google sigue requiriendo sus credenciales de producción para activarse.

Cerrar sesión conserva el comportamiento previo: revoca todas las sesiones de la cuenta. Recuperar la contraseña o eliminar la cuenta también invalida los accesos anteriores. Los tokens caducados o rechazados se eliminan del almacenamiento móvil.

La migración añade remember_me a oauth_states; conserva usuarios, contraseñas y sesiones existentes, que mantienen su vencimiento original.

Validación: 44 pruebas, incluidas persistencia al reiniciar servidor, cookies temporales, revocación, OAuth, almacenamiento nativo y recuperación. El cifrado nativo requiere probar el AAB en un dispositivo real; las pruebas unitarias usan un adaptador de almacenamiento simulado.

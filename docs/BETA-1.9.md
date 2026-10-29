# Beta 1.9 · 29 de octubre de 2026

La web pública en https://onlyfachos.webrom.cc es ahora una página promocional de una sola página. Portada panorámica negra/dorada, fotografía de campaña generada con IA, animaciones suaves, control de pausa y soporte para movimiento reducido. Incluye español, inglés y alemán; ambas tiendas indican **Próximamente**. No se ofrecen descargas públicas inexistentes.

- `/`: página de marca.
- `/demo`: entra directamente en una sesión ficticia separada. Usa un token solo en memoria y omite cookies; no reemplaza la sesión real de otra pestaña. Sin anuncios ni notificaciones reales.
- `/app`: acceso existente y registro; el paquete nativo conserva esta experiencia.
- Recuperación, retornos OAuth, enlaces a chats y páginas legales permanecen disponibles. Los retornos OAuth conservan `/app` al limpiar los parámetros para permitir recargar el formulario.

## Acceso con Google

El estado inicial del proveedor dura 15 minutos; la identidad verificada para completar el perfil dura 60 minutos. El intercambio móvil sigue siendo de dos minutos y de un solo uso. La vinculación de cuentas con contraseña conserva sus comprobaciones y no se automatiza por coincidencia de correo.

El formulario con Google se conserva cifrado con AES-GCM en IndexedDB, con clave de la pestaña en web y almacenamiento seguro nativo. Caduca tras una hora sin edición y tiene un límite absoluto de 24 horas. Se limpia al finalizar o cancelar. Solo se recupera para la misma identidad verificada; no contiene la contraseña ni tokens de Google. Si vence la identidad pendiente, permite volver a verificarla desde el mismo paso, con las fotos y datos ya completados.

En móvil, el comprobante del retorno OAuth se guarda temporalmente en almacenamiento seguro y se consume después de restaurar la sesión existente. Así se evita que una restauración tardía borre un acceso recién completado.

## Notificaciones y seguridad

La activación instala sus propios listeners antes de pedir el token Android, espera la confirmación del servidor y muestra progreso/error con plazo de respuesta. Permite abrir los ajustes de notificaciones de Android. El estado comprueba la inscripción de la sesión actual en el servidor; renovar el mismo dispositivo conserva su ID y entregas pendientes. Se mantienen la revocación por cierre/expiración/bloqueo y los avisos genéricos sin mensajes privados.

Android deshabilita respaldos y tráfico HTTP, restringe FileProvider a fotos propias de la app y archivos compartidos de caché, y mantiene el permiso explícito de notificaciones. El servidor impide incrustación en marcos, objetos y bases de URL externas, restringe capacidades del navegador y protege los nuevos archivos privados con permisos restrictivos. SQLite y la configuración privada se conservaron durante el despliegue; no se migró a Firebase.

Android `10011` activa R8, reducción de recursos, mapeo de desofuscación integrado y `WindowCompat.enableEdgeToEdge`. Google Mobile Ads `25.5.0` ya era la versión comprobada más reciente: las APIs obsoletas detectadas por Play procedían de sus SDK; no se parchean binarios del proveedor ni se promete que el aviso desaparezca antes del nuevo análisis.

## Verificación

- 66 pruebas automáticas: identidad OAuth y caducidad, privacidad, sesiones, recuperación, chat/citas, cifrado/caducidad/alteración del borrador, registro Android inmediato/error/plazo, estado push, reintentos y cambios de cuenta.
- Compilación web y del servidor Node; comprobación de rutas públicas, cabeceras, anuncios públicos y configuración de push en HTTPS.
- Prueba UI con proveedor Google simulado: vencimiento forzado al enviar el paso 3, renovación, recuperación del paso y consentimientos, fotos/bio/fecha conservadas al recargar y finalización correcta. No usa cuentas reales de Google ni crea usuarios de producción.
- Portada revisada en móvil y escritorio; sin desbordamiento horizontal y con pausa de movimiento efectiva. Demo directa comprobada.
- AAB R8 `10011` compilado, con componentes FCM/AdMob y permisos verificados contra el mapeo. Play reconoció el archivo de ReTrace incluido.

La comprobación FCM en emulador y la distribución de `10011` se registrarán en [Estado](ESTADO.md) y [Google Play](GOOGLE-PLAY.md). La entrega de notificaciones y anuncios en teléfonos físicos requiere comprobarse en esos dispositivos; iOS no tiene configuración APNs ni IPA de distribución.

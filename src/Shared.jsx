import { t, getLanguage } from './locale.mjs';
import React, { useState, useEffect, useRef } from 'react';
import { X, Ban, Flag, LoaderCircle } from 'lucide-react';
import { api } from './api';
export function locationLabel(profile) {
  return (
    profile.city + (profile.community?.region === 'Fuera de Chile' ? ' · En el extranjero' : '')
  );
}
function Photo({ profile, className = '', ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [profile?.photo]);
  return profile?.photo && !failed ? (
    <img
      className={className}
      src={profile.photo}
      alt={profile.name}
      onError={() => setFailed(true)}
      {...props}
    />
  ) : (
    <span
      className={`photo-fallback ${className}`}
      role="img"
      aria-label={profile?.name || t('Tu perfil')}
    >
      {profile?.name?.slice(0, 1) || t('R')}
    </span>
  );
}
function Button({ children, className = '', ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
function Modal({ title, children, onClose, className = '' }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const ref = useRef(null),
    previous = useRef(document.activeElement);
  useEffect(() => {
    const lastOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button,input,select,a')?.focus();
    function key(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const items = Array.from(
          ref.current.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]'),
        ).filter((e) => e.offsetParent !== null);
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = lastOverflow;
      document.removeEventListener('keydown', key);
      previous.current?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={t(title)}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{t(title)}</h2>
          <button className="icon-button" aria-label={t('Cerrar')} onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Safety({ profile, onDone, notify }) {
  const [reason, setReason] = useState('Perfil falso'),
    [details, setDetails] = useState(''),
    [alsoBlock, setAlsoBlock] = useState(true),
    [loading, setLoading] = useState(false),
    [reportDone, setReportDone] = useState(false);
  async function action(type) {
    setLoading(true);
    try {
      await api('/' + type, {
        method: 'POST',
        body: { targetId: profile.id, reason, details, alsoBlock },
      });
      notify(
        type === 'blocks'
          ? 'Perfil bloqueado. Ya no podrán verse ni conversar.'
          : 'Denuncia guardada para revisión del equipo.',
      );
      if (type === 'blocks' || alsoBlock) onDone();
      else setReportDone(true);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="form safety-form">
      <p className="modal-copy">
        {t(
          'Tu tranquilidad va primero. Bloquear un perfil cierra la conversación y evita que vuelvan a encontrarse.',
        )}
      </p>
      <Button className="secondary" disabled={loading} onClick={() => action('blocks')}>
        <Ban size={18} />
        {t(' Bloquear a ')}
        {profile.name}
      </Button>
      <div className="form-divider">
        <span />
        {t('Reportar un problema')}
        <span />
      </div>
      <fieldset className="report-reasons">
        <legend>{t('¿Qué ocurrió?')}</legend>
        {[
          'Perfil falso',
          'Acoso o amenazas',
          'Contenido inapropiado',
          'Persona menor de edad',
          'Estafa o solicitud de dinero',
          'Otro',
        ].map((v) => (
          <label key={v}>
            <input
              type="radio"
              name="reason"
              value={v}
              checked={reason === v}
              onChange={() => setReason(v)}
            />
            <span>{t(v)}</span>
          </label>
        ))}
      </fieldset>
      <label>
        {t('Algo más que debamos saber (opcional)')}
        <textarea maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={alsoBlock}
          onChange={(e) => setAlsoBlock(e.target.checked)}
        />
        <span>
          {t('Bloquear también a ')}
          {profile.name}
        </span>
      </label>
      <p className="hint">
        {t(
          'La denuncia es privada. No compartimos tu identidad ni tu mensaje con el perfil denunciado.',
        )}
      </p>
      <Button disabled={loading || reportDone} className="danger" onClick={() => action('reports')}>
        <Flag size={17} />
        {reportDone ? t('Denuncia registrada') : t('Enviar denuncia')}
      </Button>
      <p className="small-copy muted">
        {t(
          'La beta registra denuncias para revisión manual, sin prometer un plazo de respuesta. Si hay peligro inmediato, contacta a los servicios de emergencia de tu país.',
        )}
      </p>
    </div>
  );
}
function Legal({ type }) {
  const contact = (
    <p>
      <b>{t('Responsable: ')}Rodrigo Olmos · OnlyFachos</b>
      <br />
      <a href="mailto:admin@webrom.cc">admin@webrom.cc</a>
    </p>
  );
  if (type === 'child-safety')
    return (
      <div className="legal-copy">
        <h3>{t('Solo para mayores de 18 años')}</h3>
        <p>
          {t(
            'OnlyFachos prohíbe el abuso y la explotación sexual infantil (CSAE), el material de abuso sexual infantil (CSAM), la captación de menores y cualquier conducta que ponga a menores en riesgo. Las personas menores de 18 años no pueden usar la app.',
          )}
        </p>
        <h3>{t('Denunciar y bloquear')}</h3>
        <p>
          {t(
            'En el perfil o el chat, abre Opciones de seguridad para denunciar y bloquear. Puedes elegir Persona menor de edad o Contenido inapropiado y añadir detalles. También puedes informar al contacto de seguridad infantil por correo. No adjuntes ni reenvíes material de abuso.',
          )}
        </p>
        <h3>{t('Respuesta y contacto de seguridad infantil')}</h3>
        <p>
          {t(
            'El responsable revisa las denuncias, retira el contenido infractor y restringe las cuentas implicadas cuando corresponde. Los casos de explotación o abuso infantil se comunican a las autoridades competentes según la legislación aplicable.',
          )}
        </p>
        {contact}
      </div>
    );
  if (type === 'account-deletion')
    return (
      <div className="legal-copy">
        <p>
          {t(
            'Puedes eliminar tu cuenta OnlyFachos desde Perfil → Ajustes → Eliminar mi cuenta. La eliminación borra tu perfil, credenciales, mensajes y registros asociados de la base activa.',
          )}
        </p>
        <p>
          {t(
            'Si no puedes entrar, solicita la eliminación escribiendo desde tu correo de registro a admin@webrom.cc con el asunto Eliminar cuenta OnlyFachos. Confirmaremos que la cuenta es tuya antes de atender la solicitud. No envíes contraseñas ni documentos por correo.',
          )}
        </p>
        <p>
          {t(
            'Las copias de seguridad de recuperación están separadas de la base activa. Para consultas sobre la eliminación de datos en respaldos, contacta al responsable. No utilizamos esas copias para mostrar perfiles eliminados.',
          )}
        </p>
        {contact}
      </div>
    );
  if (type === 'privacy')
    return (
      <div className="legal-copy">
        <p>
          {t(
            'Si eliges mantener la sesión, el acceso se guarda hasta 30 días: en una cookie protegida en la web y en el almacenamiento cifrado del dispositivo en la app móvil. Sin esa opción, la sesión es temporal, con un máximo de 12 horas. No guardamos tu contraseña en el dispositivo. Cerrar sesión o restablecer la contraseña invalida los accesos anteriores.',
          )}
        </p>
        <p>
          {t(
            'OnlyFachos guarda tu nombre, correo, fecha de nacimiento, ciudad, foto, perfil, valores, intereses, datos opcionales de política y religión, invitaciones, propuestas de citas, visitas al perfil, preferencias y mensajes en el servidor de la aplicación.',
          )}
        </p>
        <h3>{t('Valores que eliges compartir')}</h3>
        <p>
          {t(
            'Los valores, referentes, afiliación política y religión son opcionales. Tú decides cuáles publicar y aceptas su uso para sugerir conexiones. Puedes cambiarlos, descargar tus datos o eliminar tu cuenta en Mi perfil. Puedes ocultar fe y partido, pausar tu perfil y gestionar bloqueos en Ajustes. No recogemos ubicación GPS; «Cerca» usa tu ciudad declarada. Solo mostramos tu edad, no tu fecha de nacimiento ni tu correo.',
          )}
        </p>
        <h3>{t('Google y publicidad')}</h3>
        <p>
          {t(
            'Google se usa únicamente para verificar tu identidad y obtener tu correo y nombre. No guardamos sus tokens de acceso. AdMob se ofrece solo en móvil, con consentimiento y anuncios no personalizados. No enviamos valores, opiniones políticas, mensajes ni datos del perfil a AdMob. La web no tiene publicidad ni analítica.',
          )}
        </p>
        <h3>{t('Tu control')}</h3>
        <p>
          {t(
            'Si activas notificaciones, guardamos la suscripción de ese dispositivo y usamos su servicio push (Google FCM en Android o el proveedor del navegador). Solo enviamos avisos genéricos de mensajes y citas. Puedes desactivarlos en Ajustes; se revocan al cerrar sesión, caducar el acceso o eliminar la cuenta. Firebase Analytics no está habilitado.',
          )}
        </p>
        <p>
          {t(
            'El SDK de anuncios móvil puede procesar la dirección IP, identificadores del dispositivo, interacciones y diagnósticos para publicidad, medición y prevención de fraude. Las opiniones políticas y la religión del perfil no se usan para segmentar anuncios.',
          )}
        </p>
        <p>
          {t(
            'Mi perfil → Ajustes → Descargar mis datos / Eliminar mi cuenta. Al eliminarla, borramos los registros asociados de la base activa. Puedes escribir al responsable para consultas de privacidad y eliminación de datos en respaldos.',
          )}
        </p>
        <p className="legal-status">
          {t(
            'Conservamos los datos de tu cuenta mientras mantengas la cuenta activa. Los correos de recuperación usan un enlace de un solo uso que vence en 30 minutos. El servidor del hosting procesa el correo y Gmail recibe las consultas al soporte.',
          )}
        </p>
        {contact}
      </div>
    );
  return (
    <div className="legal-copy">
      <p>
        {t(
          'OnlyFachos es una comunidad de citas para personas mayores de 18 años, inspirada en la libertad, la familia y los valores compartidos.',
        )}
      </p>
      <h3>{t('Ideas claras. Respeto siempre.')}</h3>
      <p>
        {t(
          'Usa tu identidad, publica fotos propias y trata a los demás con respeto. No se permiten acoso, amenazas, discriminación, odio, estafas, suplantación, pornografía, explotación sexual ni contenido relacionado con abuso o explotación de menores.',
        )}
      </p>
      <h3>{t('Conecta con cuidado')}</h3>
      <p>
        {t(
          'Puedes iniciar una conversación desde el feed. Una cita requiere que ambos acepten. No compartas dinero, documentos ni tu dirección con personas desconocidas. Puedes denunciar o bloquear desde el perfil o la conversación.',
        )}
      </p>
      <h3>{t('Sobre esta versión')}</h3>
      <p>
        {t(
          'Los perfiles del modo demo son ficticios y sus respuestas están simuladas. Las cuentas reales están separadas de la demo. No hay verificación de identidad, cobros ni suscripciones activas. Las denuncias quedan registradas para que el operador las revise.',
        )}
      </p>
      <p className="legal-status">
        {t(
          'La beta recibe consultas privadas en Ajustes → Contactar soporte y denuncias en cada perfil. También puedes escribir a admin@webrom.cc. Rodrigo Olmos es el responsable de la aplicación y de revisar las denuncias.',
        )}
      </p>
    </div>
  );
}

export { Photo, Button, Modal, Safety, Legal };

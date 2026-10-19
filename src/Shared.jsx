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
      aria-label={profile?.name || 'Tu perfil'}
    >
      {profile?.name?.slice(0, 1) || 'R'}
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
        aria-label={title}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
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
    [loading, setLoading] = useState(false),
    [reportDone, setReportDone] = useState(false);
  async function action(type) {
    setLoading(true);
    try {
      await api('/' + type, { method: 'POST', body: { targetId: profile.id, reason } });
      notify(
        type === 'blocks'
          ? 'Perfil bloqueado. Ya no podrán verse ni conversar.'
          : 'Denuncia guardada para revisión del equipo.',
      );
      if (type === 'blocks') onDone();
      else setReportDone(true);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="form">
      <p className="modal-copy">
        Tu tranquilidad va primero. Bloquear un perfil cierra la conversación y evita que vuelvan a
        encontrarse.
      </p>
      <Button className="secondary" disabled={loading} onClick={() => action('blocks')}>
        <Ban size={18} /> Bloquear a {profile.name}
      </Button>
      <div className="form-divider">
        <span />
        Reportar un problema
        <span />
      </div>
      <label>
        ¿Qué ocurrió?
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {[
            'Perfil falso',
            'Acoso o amenazas',
            'Contenido inapropiado',
            'Persona menor de edad',
            'Otro',
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <Button
        disabled={loading || reportDone}
        className="secondary"
        onClick={() => action('reports')}
      >
        <Flag size={17} />
        {reportDone ? 'Denuncia registrada' : 'Enviar denuncia'}
      </Button>
      <p className="small-copy muted">
        Esta versión registra denuncias en el servidor. El operador debe revisar y atender los
        reportes.
      </p>
    </div>
  );
}
function Legal({ type }) {
  if (type === 'privacy')
    return (
      <div className="legal-copy">
        <p>
          OnlyFachos guarda tu nombre, correo, fecha de nacimiento, ciudad, foto, perfil, valores,
          intereses, datos opcionales de política y religión, invitaciones y mensajes en el servidor
          de la aplicación.
        </p>
        <h3>Valores que eliges compartir</h3>
        <p>
          Los valores, referentes, afiliación política y religión son opcionales. Tú decides cuáles
          publicar y aceptas su uso para sugerir conexiones. Puedes cambiarlos, descargar tus datos
          o eliminar tu cuenta en Mi perfil. Solo mostramos tu edad, no tu fecha de nacimiento ni tu
          correo.
        </p>
        <h3>Google y publicidad</h3>
        <p>
          Google se usa únicamente para verificar tu identidad y obtener tu correo y nombre. No
          guardamos sus tokens de acceso. AdMob se ofrece solo en móvil, con consentimiento y
          anuncios no personalizados. No enviamos valores, opiniones políticas, mensajes ni datos
          del perfil a AdMob. La web no tiene publicidad ni analítica.
        </p>
        <h3>Tu control</h3>
        <p>
          Mi perfil → Descargar mis datos / Eliminar mi cuenta. Al eliminarla, borramos los
          registros asociados de la base activa. El operador debe gestionar también la eliminación
          de copias de seguridad y publicar su contacto y plazos antes de abrir el servicio al
          público.
        </p>
        <p className="legal-status">
          Texto de la versión de prueba. El operador y el contacto de privacidad todavía deben
          configurarse para el lanzamiento.
        </p>
      </div>
    );
  return (
    <div className="legal-copy">
      <p>
        OnlyFachos es una comunidad de citas para personas mayores de 18 años, inspirada en la
        libertad, la familia y los valores compartidos.
      </p>
      <h3>Ideas claras. Respeto siempre.</h3>
      <p>
        Usa tu identidad, publica fotos propias y trata a los demás con respeto. No se permiten
        acoso, amenazas, discriminación, odio, estafas, suplantación, pornografía, explotación
        sexual ni contenido relacionado con abuso o explotación de menores.
      </p>
      <h3>Conecta con cuidado</h3>
      <p>
        Puedes iniciar una conversación desde el feed. Una cita requiere que ambos acepten. No
        compartas dinero, documentos ni tu dirección con personas desconocidas. Puedes denunciar o
        bloquear desde el perfil o la conversación.
      </p>
      <h3>Sobre esta versión</h3>
      <p>
        Los perfiles del modo demo son ficticios y sus respuestas están simuladas. Las cuentas
        reales están separadas de la demo. No hay verificación de identidad, cobros ni suscripciones
        activas. Las denuncias quedan registradas para que el operador las revise.
      </p>
      <p className="legal-status">
        Antes del lanzamiento se requiere un equipo de moderación, un contacto de soporte y
        políticas definitivas del operador.
      </p>
    </div>
  );
}

export { Photo, Button, Modal, Safety, Legal };

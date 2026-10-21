import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Settings,
  ChevronRight,
  Eye,
  Pencil,
  Shield,
  Sparkles,
  Check,
  MessageCircle,
  Camera,
  Bell,
  MapPin,
} from 'lucide-react';
import { api } from './api';
import { Button, Modal, Photo, locationLabel } from './Shared';

export function Toggle({ label, hint, checked, onChange, disabled = false }) {
  return (
    <label className="beta-row toggle-row">
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
function Row({ title, value, hint, onClick }) {
  return (
    <button className="beta-row" onClick={onClick}>
      <span>
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </span>
      <span>
        {value}
        <ChevronRight size={18} />
      </span>
    </button>
  );
}
export function ProfileDetail({ profile: p, me, onWrite, safety, onClose }) {
  const c = p.community || {},
    photos = c.photos?.length ? c.photos : [p.photo],
    common = p.common || [];
  return (
    <Modal
      title={'PERFIL DE ' + p.name.toUpperCase()}
      className="profile-detail-modal"
      onClose={onClose}
    >
      <div className="detail-hero">
        <Photo profile={{ ...p, photo: photos[0] }} />
        <div>
          <small>{p.demo ? 'PERFIL FICTICIO · DEMO' : p.online ? '● EN LÍNEA' : ''}</small>
          <h1>
            {p.name}, {p.age}
          </h1>
          <p>
            <mark>{c.current || 'Ideas propias'}</mark> {p.occupation} · {locationLabel(p)}
          </p>
        </div>
      </div>
      <div className="detail-copy">
        <p>{p.bio || 'Una buena conversación empieza con un hola.'}</p>
        <section className="common-panel">
          <h3>
            {common.length ? common.length + ' COSAS EN COMÚN' : 'ALGO POR DESCUBRIR'}{' '}
            <small>CONTIGO</small>
          </h3>
          {common.length ? (
            <div>
              {common.map((v) => (
                <b key={v}>{v}</b>
              ))}
            </div>
          ) : (
            <p>Pregúntale qué le mueve. No hace falta pensar igual en todo.</p>
          )}
        </section>
        <h4>SU LADO DEL ESPECTRO</h4>
        <dl className="detail-facts">
          {[
            ['De derecha', c.years],
            ['Corriente', c.current],
            ['Fe', c.faith === 'Sí' ? c.denomination || 'Creyente' : c.faith],
            ['Hijos', c.children],
            ['Partido', [c.partyStance, c.party].filter(Boolean).join(' · ')],
            ['Trabajo', p.occupation],
            ['Idiomas', c.languages?.map((l) => l.language + ' · ' + l.level).join(', ')],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || 'Sin compartir'}</dd>
            </div>
          ))}
        </dl>
        {photos[1] && (
          <img className="detail-photo" src={photos[1]} alt={'Segunda foto de ' + p.name} />
        )}
        <h2>LO QUE CONSUME</h2>
        {[
          ['STREAMERS', c.streamers, 'Ve '],
          ['ESCRITORES Y PENSADORES', c.authors, 'Lee a '],
          ['ARTISTAS Y CANTANTES', c.artists, 'Escucha '],
          ['CREADORES', c.creators, 'Sigue a '],
        ].map(([k, v, prefix]) => (
          <section className="detail-tags" key={k}>
            <h4>{k}</h4>
            <div>
              {v?.length ? (
                v.map((s) => (
                  <span key={s} className={common.includes(prefix + s) ? 'shared' : ''}>
                    {s}
                  </span>
                ))
              ) : (
                <small>Sin compartir</small>
              )}
            </div>
          </section>
        ))}
        {c.debate && (
          <blockquote className="debate">
            <mark>DEBATE ME ON</mark>
            <h2>{c.debate}</h2>
          </blockquote>
        )}
        {photos.slice(2).map((src, i) => (
          <img
            key={i}
            className="detail-photo"
            src={src}
            alt={'Foto ' + (i + 3) + ' de ' + p.name}
          />
        ))}
      </div>
      <footer className="detail-footer">
        <button
          className="icon-button"
          aria-label="Bloquear o denunciar perfil"
          onClick={() => safety(p)}
        >
          <Shield size={20} />
        </button>
        <Button onClick={() => onWrite(p)}>
          <MessageCircle size={17} />
          {p.id === me.id ? 'ASÍ TE VEN' : 'ESCRIBIRLE A ' + p.name.toUpperCase()}
        </Button>
      </footer>
    </Modal>
  );
}
export function BetaAccount({ user, onEdit, onPreview, onSettings, saveSettings, onPro, notify }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api('/me/stats')
      .then(setStats)
      .catch((e) => notify(e.message, true));
  }, [user.id]);
  const c = user.community || {},
    photos = c.photos || [user.photo];
  const complete = [
    !!user.name,
    !!user.bio,
    photos.length >= 2,
    photos.length >= 3,
    !!user.city,
    !!user.occupation,
    !!c.debate,
    !!(c.artists?.length || c.authors?.length || c.streamers?.length),
    !!c.languages?.length,
    !!user.intention,
  ];
  const percent = Math.round((100 * complete.filter(Boolean).length) / complete.length);
  return (
    <section className="beta-page account-beta">
      <div className="beta-heading">
        <h1>MI PERFIL</h1>
        <button className="icon-button" aria-label="Abrir ajustes" onClick={onSettings}>
          <Settings />
        </button>
      </div>
      <div className="beta-identity">
        <Photo profile={user} />
        <div>
          <h2>
            {user.name}, {user.age}
          </h2>
          <p>
            <span className="current-tag">{c.current || 'Ideas propias'}</span> {user.occupation} ·{' '}
            {locationLabel(user)}
          </p>
          {user.demo && <small>PERFIL DE DEMOSTRACIÓN</small>}
        </div>
      </div>
      <div className="beta-actions">
        <Button onClick={() => onEdit(1)}>
          <Pencil size={16} />
          Editar perfil
        </Button>
        <Button className="secondary" onClick={onPreview}>
          <Eye size={16} />
          Cómo me ven
        </Button>
      </div>
      <section className="beta-panel completeness">
        <b>Tu perfil está al {percent}%</b>
        <strong>{percent}%</strong>
        <progress value={percent} max="100" />
        <small>
          Una bio, tus fotos y tu «Debate me on» ayudan a romper el hielo. Los datos de política y
          religión son opcionales.
        </small>
      </section>
      <div className="beta-stats">
        {[
          ['VISITAS', stats?.visits],
          ['CHATS', stats?.chats],
          ['CITAS', stats?.dates],
        ].map(([k, v]) => (
          <div key={k}>
            <b>{v ?? '—'}</b>
            <small>{k}</small>
          </div>
        ))}
      </div>
      <button className="pro-banner" onClick={onPro}>
        <Sparkles />
        <span>
          <b>CONOCE ONLYFACHOS PRO</b>
          <small>Estamos preparando lo que viene. Sin cobros en la beta.</small>
        </span>
        <ChevronRight />
      </button>
      <div className="beta-heading mini">
        <h4>MIS FOTOS · {photos.length}/6</h4>
        <button className="text-link" onClick={() => onEdit(1)}>
          Ordenar
        </button>
      </div>
      <div className="beta-photos">
        {photos.map((src, i) => (
          <button key={i} onClick={() => onEdit(1)} aria-label={'Editar foto ' + (i + 1)}>
            <img src={src} alt={'Mi foto ' + (i + 1)} />
            {i === 0 && <small>PRINCIPAL</small>}
          </button>
        ))}
      </div>
      <div className="beta-group">
        <Row
          title="Lo básico"
          hint="Nombre, bio, ciudad, sexo, trabajo"
          onClick={() => onEdit(1)}
        />
        <Row
          title="Qué consumes"
          hint="Streamers, pensadores, artistas"
          onClick={() => onEdit(2)}
        />
        <Row
          title="Tu lado del espectro"
          hint="Corriente, fe, hijos, idiomas, viajes"
          onClick={() => onEdit(3)}
        />
        <Toggle
          label="Pausar perfil"
          hint="Nadie nuevo te ve; tus chats siguen"
          checked={user.settings?.paused}
          onChange={(paused) => saveSettings({ paused })}
        />
      </div>
      <p className="hint beta-version">ONLYFACHOS · BETA 1 · MAYORES DE 18 AÑOS</p>
    </section>
  );
}
export function BetaSettings({
  user,
  theme,
  setTheme,
  saveSettings,
  onBack,
  onLegal,
  onDelete,
  logout,
  exportData,
  notify,
  onService,
  onAds,
  onAdPrivacy,
}) {
  const [blocked, setBlocked] = useState(null),
    [showBlocked, setShowBlocked] = useState(false),
    [working, setWorking] = useState(false);
  const s = user.settings || {};
  async function unblock(id) {
    setWorking(true);
    try {
      await api('/me/blocked/' + id, { method: 'DELETE' });
      setBlocked((v) => v.filter((p) => p.id !== id));
      notify('Perfil desbloqueado. Los mensajes borrados por el bloqueo no se recuperan.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="beta-page settings-beta">
      <div className="beta-heading">
        <button className="icon-button" aria-label="Volver a mi perfil" onClick={onBack}>
          <ArrowLeft />
        </button>
        <h1>AJUSTES</h1>
      </div>
      <h4>APARIENCIA</h4>
      <div className="segmented">
        {[
          ['light', 'Claro'],
          ['dark', 'Oscuro'],
          ['auto', 'Automático'],
        ].map(([v, t]) => (
          <button
            key={v}
            aria-pressed={theme === v}
            className={theme === v ? 'selected' : ''}
            onClick={() => {
              setTheme(v);
              saveSettings({ appearance: v });
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <h4>CUENTA</h4>
      <div className="beta-group">
        <div className="beta-row">
          <b>Correo</b>
          <span className="break-word">{user.email || 'Sesión demo'}</span>
        </div>
        <Row title="Verificación" value="Sin verificar" onClick={() => onService('verification')} />
        <Row title="Suscripción" value="Gratis" onClick={() => onService('pro')} />
      </div>
      <h4>NOTIFICACIONES</h4>
      <div className="beta-group">
        {[
          ['messages', 'Mensajes nuevos'],
          ['dates', 'Avisos de cita'],
          ['news', 'Novedades de OnlyFachos'],
        ].map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            checked={s[key]}
            onChange={(value) => saveSettings({ [key]: value })}
          />
        ))}
      </div>
      <p className="hint">
        Guardamos tus preferencias. Los avisos se muestran dentro de la app; las notificaciones push
        aún no están activadas.
      </p>
      <h4>PRIVACIDAD</h4>
      <div className="beta-group">
        <Toggle
          label="Ocultar mi partido"
          hint="Se oculta también en las sugerencias"
          checked={s.hideParty}
          onChange={(hideParty) => saveSettings({ hideParty })}
        />
        <Toggle
          label="Ocultar mi fe"
          hint="Nadie la ve en tu perfil público"
          checked={s.hideFaith}
          onChange={(hideFaith) => saveSettings({ hideFaith })}
        />
        <div className="beta-row">
          <span>
            <b>Distancia y ubicación</b>
            <small>En esta beta se usa tu ciudad. No recogemos GPS.</small>
          </span>
          <MapPin size={18} />
        </div>
        <Row
          title="Usuarios bloqueados"
          onClick={async () => {
            try {
              setBlocked(await api('/me/blocked'));
              setShowBlocked(true);
            } catch (e) {
              notify(e.message, true);
            }
          }}
        />
      </div>
      <h4>PUBLICIDAD EN MÓVIL</h4>
      <div className="beta-group">
        <Row
          title="Anuncios AdMob"
          hint="Opcional; requiere configuración nativa"
          onClick={onAds}
        />
        <Row title="Privacidad de anuncios" onClick={onAdPrivacy} />
      </div>
      <h4>AYUDA Y LEGAL</h4>
      <div className="beta-group">
        <Row title="Normas y condiciones" onClick={() => onLegal('terms')} />
        <Row title="Política de privacidad" onClick={() => onLegal('privacy')} />
        <Row title="Contactar soporte" onClick={() => onService('support')} />
        <Row title="Descargar mis datos" onClick={exportData} />
      </div>
      <Button className="secondary" onClick={logout}>
        Cerrar sesión
      </Button>
      <button className="text-link danger-text" onClick={onDelete}>
        Eliminar mi cuenta
      </button>
      {showBlocked && (
        <Modal title="USUARIOS BLOQUEADOS" onClose={() => setShowBlocked(false)}>
          {blocked?.length ? (
            blocked.map((p) => (
              <div className="beta-row" key={p.id}>
                <Photo profile={p} className="avatar" />
                <b>{p.name}</b>
                <button disabled={working} className="text-link" onClick={() => unblock(p.id)}>
                  Desbloquear
                </button>
              </div>
            ))
          ) : (
            <p>No tienes perfiles bloqueados.</p>
          )}
        </Modal>
      )}
    </section>
  );
}
export function BetaService({ kind, onClose, notify }) {
  const [text, setText] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  const support = kind === 'support',
    verification = kind === 'verification';
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/me/feedback', {
        method: 'POST',
        body: {
          kind,
          text: support
            ? text
            : verification
              ? 'Me interesa la verificación de perfil.'
              : 'Me interesa OnlyFachos PRO.',
        },
      });
      setSent(true);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        support ? 'CONTACTAR SOPORTE' : verification ? 'VERIFICA QUE ERES TÚ' : 'ONLYFACHOS PRO'
      }
      className="service-modal"
      onClose={onClose}
    >
      <span className="label-strip">BETA 1</span>
      {verification ? (
        <Camera size={45} />
      ) : support ? (
        <MessageCircle size={45} />
      ) : (
        <Sparkles size={45} />
      )}
      <h1>
        {support ? 'TE LEEMOS.' : verification ? 'PERSONAS REALES.' : 'MÁS CONEXIONES. MÁS TÚ.'}
      </h1>
      <p>
        {support
          ? 'Cuéntanos el problema o una idea. Tu mensaje queda en la bandeja privada del operador. No adjuntes contraseñas ni documentos.'
          : verification
            ? 'Estamos preparando una verificación segura. Todavía no hay proveedor activo: no pedimos selfies ni documentos y no concedemos insignias. Puedes seguir usando la app.'
            : 'La beta es gratuita. Estamos evaluando filtros avanzados, estadísticas y personalización. Aún no hay planes, pagos ni suscripciones activas.'}
      </p>
      {!support && !verification && (
        <div className="beta-group">
          <div className="beta-row">
            <b>Referentes compartidos</b>
            <span>Incluido en beta</span>
          </div>
          <div className="beta-row">
            <b>Chat directo y citas</b>
            <Check size={18} />
          </div>
          <div className="beta-row">
            <b>Visitas a tu perfil</b>
            <Check size={18} />
          </div>
        </div>
      )}
      <form className="form" onSubmit={send}>
        {support && (
          <label>
            Tu mensaje
            <textarea
              required
              minLength={5}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        )}
        {sent ? (
          <p role="status">
            {support
              ? 'Mensaje registrado. Puedes cerrar esta ventana.'
              : 'Interés registrado. Gracias por ayudarnos a definir lo que viene.'}
          </p>
        ) : (
          <Button disabled={busy}>{support ? 'ENVIAR MENSAJE' : 'ME INTERESA'}</Button>
        )}
        <button type="button" className="text-link" onClick={onClose}>
          Seguir explorando
        </button>
      </form>
    </Modal>
  );
}
export function BetaFilters({ filters, onApply }) {
  const [d, set] = useState(filters),
    [count, setCount] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setCount(null);
    const t = setTimeout(() => {
      api('/community/profiles?' + new URLSearchParams({ ...d, limit: 1 }))
        .then((r) => {
          if (alive) {
            setCount(r.total);
            setError('');
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [d]);
  return (
    <form
      className="form beta-filters"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(d);
      }}
    >
      <span className="label-strip">A TU MEDIDA</span>
      <h4>
        EDAD · {d.minAge} — {d.maxAge} AÑOS
      </h4>
      <label>
        Desde {d.minAge}
        <input
          type="range"
          min={18}
          max={100}
          value={d.minAge}
          onChange={(e) =>
            set({ ...d, minAge: +e.target.value, maxAge: Math.max(+e.target.value, +d.maxAge) })
          }
        />
      </label>
      <label>
        Hasta {d.maxAge}
        <input
          type="range"
          min={d.minAge}
          max={100}
          value={d.maxAge}
          onChange={(e) => set({ ...d, maxAge: +e.target.value })}
        />
      </label>
      <label>
        Quiero conocer
        <select value={d.gender} onChange={(e) => set({ ...d, gender: e.target.value })}>
          <option value="todos">Todas las personas</option>
          <option value="mujer">Mujeres</option>
          <option value="hombre">Hombres</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label>
        Ciudad
        <input
          maxLength={60}
          placeholder="Cualquier ciudad"
          value={d.city}
          onChange={(e) => set({ ...d, city: e.target.value })}
        />
      </label>
      <p className="hint">
        «Cerca» usa tu misma ciudad. La distancia en kilómetros todavía no está disponible.
      </p>
      {[
        [
          'current',
          'Corriente',
          [
            'Libertario',
            'Libertaria',
            'Liberal clásico',
            'Liberal clásica',
            'Conservador',
            'Conservadora',
          ],
        ],
        ['faith', 'Fe', ['Sí', 'No', 'En búsqueda']],
        ['children', 'Hijos', ['Sí', 'Ya tengo', 'Algún día', 'No']],
      ].map(([key, label, choices]) => (
        <label key={key}>
          {label}
          <select value={d[key] || ''} onChange={(e) => set({ ...d, [key]: e.target.value })}>
            <option value="">Cualquiera</option>
            {choices.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      ))}
      <Toggle
        label="Referentes en común"
        checked={d.shared === 'true'}
        onChange={(v) => set({ ...d, shared: String(v) })}
      />
      <Toggle
        label="Solo verificados"
        hint="Aún no hay verificación activa en esta beta"
        checked={d.verified === 'true'}
        onChange={(v) => set({ ...d, verified: String(v) })}
      />
      {error && <p role="alert">{error}</p>}
      <Button>VER {count ?? '…'} PERFILES</Button>
      <button
        type="button"
        className="text-link"
        onClick={() =>
          set({
            minAge: 18,
            maxAge: 60,
            gender: 'todos',
            city: '',
            current: '',
            faith: '',
            children: '',
            shared: 'false',
            verified: 'false',
          })
        }
      >
        Restablecer filtros
      </button>
    </form>
  );
}

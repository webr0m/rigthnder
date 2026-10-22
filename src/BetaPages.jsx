import { t, getLanguage, translateCommon } from './locale.mjs';
import React, { useEffect, useState } from 'react';
import LanguagePicker from './LanguagePicker';
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
        <b>{t(label)}</b>
        {hint && <small>{t(hint)}</small>}
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
        <b>{t(title)}</b>
        {hint && <small>{t(hint)}</small>}
      </span>
      <span>
        {t(value)}
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
      title={t('PERFIL DE ') + p.name.toUpperCase()}
      className="profile-detail-modal"
      onClose={onClose}
    >
      <div className="detail-hero">
        <Photo profile={{ ...p, photo: photos[0] }} />
        <div>
          <small>{p.demo ? t('PERFIL FICTICIO · DEMO') : p.online ? t('● EN LÍNEA') : ''}</small>
          <h1>
            {p.name}, {p.age}
          </h1>
          <p>
            <mark>{t(c.current) || t('Ideas propias')}</mark> {p.occupation} · {locationLabel(p)}
          </p>
        </div>
      </div>
      <div className="detail-copy">
        <p>{p.bio || t('Una buena conversación empieza con un hola.')}</p>
        <section className="common-panel">
          <h3>
            {common.length ? common.length + t(' COSAS EN COMÚN') : t('ALGO POR DESCUBRIR')}{' '}
            <small>{t('CONTIGO')}</small>
          </h3>
          {common.length ? (
            <div>
              {common.map((v) => (
                <b key={v}>{translateCommon(v)}</b>
              ))}
            </div>
          ) : (
            <p>{t('Pregúntale qué le mueve. No hace falta pensar igual en todo.')}</p>
          )}
        </section>
        <h4>{t('SU LADO DEL ESPECTRO')}</h4>
        <dl className="detail-facts">
          {[
            ['De derecha', t(c.years)],
            ['Corriente', t(c.current)],
            ['Fe', c.faith === 'Sí' ? t(c.denomination) || t('Creyente') : t(c.faith)],
            ['Hijos', t(c.children)],
            ['Partido', [t(c.partyStance), c.party].filter(Boolean).join(' · ')],
            ['Trabajo', p.occupation],
            ['Idiomas', c.languages?.map((l) => t(l.language) + ' · ' + t(l.level)).join(', ')],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{t(k)}</dt>
              <dd>{v || t('Sin compartir')}</dd>
            </div>
          ))}
        </dl>
        {photos[1] && (
          <img className="detail-photo" src={photos[1]} alt={t('Segunda foto de ') + p.name} />
        )}
        <h2>{t('LO QUE CONSUME')}</h2>
        {[
          ['STREAMERS', c.streamers, 'Ve '],
          ['ESCRITORES Y PENSADORES', c.authors, 'Lee a '],
          ['ARTISTAS Y CANTANTES', c.artists, 'Escucha '],
          ['CREADORES', c.creators, 'Sigue a '],
        ].map(([k, v, prefix]) => (
          <section className="detail-tags" key={k}>
            <h4>{t(k)}</h4>
            <div>
              {v?.length ? (
                v.map((s) => (
                  <span key={s} className={common.includes(prefix + s) ? 'shared' : ''}>
                    {s}
                  </span>
                ))
              ) : (
                <small>{t('Sin compartir')}</small>
              )}
            </div>
          </section>
        ))}
        {c.debate && (
          <blockquote className="debate">
            <mark>{t('HABLEMOS DE')}</mark>
            <h2>{c.debate}</h2>
          </blockquote>
        )}
        {photos.slice(2).map((src, i) => (
          <img
            key={i}
            className="detail-photo"
            src={src}
            alt={t('Foto ') + (i + 3) + t(' de ') + p.name}
          />
        ))}
      </div>
      <footer className="detail-footer">
        <button
          className="icon-button"
          aria-label={t('Bloquear o denunciar perfil')}
          onClick={() => safety(p)}
        >
          <Shield size={20} />
        </button>
        <Button onClick={() => onWrite(p)}>
          <MessageCircle size={17} />
          {p.id === me.id ? t('ASÍ TE VEN') : t('ESCRIBIRLE A ') + p.name.toUpperCase()}
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
        <h1>{t('MI PERFIL')}</h1>
        <button className="icon-button" aria-label={t('Abrir ajustes')} onClick={onSettings}>
          <Settings />
        </button>
      </div>
      <div className="beta-identity">
        <Photo profile={user} className="account-avatar" />
        <div className="account-identity-copy">
          <h2>
            {user.name}, {user.age}
          </h2>
          <p>
            <span className="current-tag">{t(c.current) || t('Ideas propias')}</span>
          </p>
          {user.occupation && <p>{user.occupation}</p>}
          <p>{locationLabel(user)}</p>
          {user.demo && <small>{t('PERFIL DE DEMOSTRACIÓN')}</small>}
        </div>
      </div>
      <div className="beta-actions">
        <Button onClick={() => onEdit(1)}>
          <Pencil size={16} />
          {t('Editar perfil')}
        </Button>
        <Button className="secondary" onClick={onPreview}>
          <Eye size={16} />
          {t('Cómo me ven')}
        </Button>
      </div>
      <section className="beta-panel completeness">
        <b>
          {t('Tu perfil está al ')}
          {percent}%
        </b>
        <strong>{percent}%</strong>
        <progress value={percent} max="100" />
        <small>
          {t(
            'Una bio, tus fotos y tu «Hablemos de» ayudan a romper el hielo. Los datos de política y religión son opcionales.',
          )}
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
            <small>{t(k)}</small>
          </div>
        ))}
      </div>
      <button className="pro-banner" onClick={onPro}>
        <Sparkles />
        <span>
          <b>{t('CONOCE ONLYFACHOS PRO')}</b>
          <small>{t('Estamos preparando lo que viene. Sin cobros en la beta.')}</small>
        </span>
        <ChevronRight />
      </button>
      <div className="beta-heading mini">
        <h4>
          {t('MIS FOTOS · ')}
          {photos.length}/6
        </h4>
        <button className="text-link" onClick={() => onEdit(1)}>
          {t('Ordenar')}
        </button>
      </div>
      <div className="beta-photos">
        {photos.map((src, i) => (
          <button key={i} onClick={() => onEdit(1)} aria-label={t('Editar foto ') + (i + 1)}>
            <img src={src} alt={t('Mi foto ') + (i + 1)} />
            {i === 0 && <small>{t('PRINCIPAL')}</small>}
          </button>
        ))}
      </div>
      <div className="beta-group">
        <Row
          title={t('Lo básico')}
          hint={t('Nombre, bio, ciudad, sexo, trabajo')}
          onClick={() => onEdit(1)}
        />
        <Row
          title={t('Qué consumes')}
          hint={t('Streamers, pensadores, artistas')}
          onClick={() => onEdit(2)}
        />
        <Row
          title={t('Tu lado del espectro')}
          hint={t('Corriente, fe, hijos, idiomas, viajes')}
          onClick={() => onEdit(3)}
        />
        <Toggle
          label={t('Pausar perfil')}
          hint={t('Nadie nuevo te ve; tus chats siguen')}
          checked={user.settings?.paused}
          onChange={(paused) => saveSettings({ paused })}
        />
      </div>
      <p className="hint beta-version">{t('ONLYFACHOS · BETA 1 · MAYORES DE 18 AÑOS')}</p>
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
        <button className="icon-button" aria-label={t('Volver a mi perfil')} onClick={onBack}>
          <ArrowLeft />
        </button>
        <h1>{t('AJUSTES')}</h1>
      </div>
      <h4>{t('APARIENCIA')}</h4>
      <div className="segmented">
        {[
          ['light', 'Claro'],
          ['dark', 'Oscuro'],
          ['auto', 'Automático'],
        ].map(([v, label]) => (
          <button
            key={v}
            aria-pressed={theme === v}
            className={theme === v ? 'selected' : ''}
            onClick={() => {
              setTheme(v);
              saveSettings({ appearance: v });
            }}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <h4>{t('IDIOMA DE LA APP')}</h4>
      <LanguagePicker onChange={(language) => saveSettings({ language })} />
      <h4>{t('CUENTA')}</h4>
      <div className="beta-group">
        <div className="beta-row">
          <b>{t('Correo')}</b>
          <span className="break-word">{user.email || t('Sesión demo')}</span>
        </div>
        <Row
          title={t('Verificación')}
          value="Sin verificar"
          onClick={() => onService('verification')}
        />
        <Row title={t('Suscripción')} value="Gratis" onClick={() => onService('pro')} />
      </div>
      <h4>{t('NOTIFICACIONES')}</h4>
      <div className="beta-group">
        {[
          ['messages', 'Mensajes nuevos'],
          ['dates', 'Avisos de cita'],
          ['news', 'Novedades de OnlyFachos'],
        ].map(([key, label]) => (
          <Toggle
            key={key}
            label={t(label)}
            checked={s[key]}
            onChange={(value) => saveSettings({ [key]: value })}
          />
        ))}
      </div>
      <p className="hint">
        {t(
          'Guardamos tus preferencias. Los avisos se muestran dentro de la app; las notificaciones push aún no están activadas.',
        )}
      </p>
      <h4>{t('PRIVACIDAD')}</h4>
      <div className="beta-group">
        <Toggle
          label={t('Ocultar mi partido')}
          hint={t('Se oculta también en las sugerencias')}
          checked={s.hideParty}
          onChange={(hideParty) => saveSettings({ hideParty })}
        />
        <Toggle
          label={t('Ocultar mi fe')}
          hint={t('Nadie la ve en tu perfil público')}
          checked={s.hideFaith}
          onChange={(hideFaith) => saveSettings({ hideFaith })}
        />
        <div className="beta-row">
          <span>
            <b>{t('Distancia y ubicación')}</b>
            <small>{t('En esta beta se usa tu ciudad. No recogemos GPS.')}</small>
          </span>
          <MapPin size={18} />
        </div>
        <Row
          title={t('Usuarios bloqueados')}
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
      <h4>{t('PUBLICIDAD EN MÓVIL')}</h4>
      <div className="beta-group">
        <Row
          title={t('Anuncios AdMob')}
          hint={t('Opcional; requiere configuración nativa')}
          onClick={onAds}
        />
        <Row title={t('Privacidad de anuncios')} onClick={onAdPrivacy} />
      </div>
      <h4>{t('AYUDA Y LEGAL')}</h4>
      <div className="beta-group">
        <Row title={t('Normas y condiciones')} onClick={() => onLegal('terms')} />
        <Row title={t('Política de privacidad')} onClick={() => onLegal('privacy')} />
        <Row title={t('Contactar soporte')} onClick={() => onService('support')} />
        <Row title={t('Descargar mis datos')} onClick={exportData} />
      </div>
      <Button className="secondary" onClick={logout}>
        {t('Cerrar sesión')}
      </Button>
      <button className="text-link danger-text" onClick={onDelete}>
        {t('Eliminar mi cuenta')}
      </button>
      {showBlocked && (
        <Modal title={t('USUARIOS BLOQUEADOS')} onClose={() => setShowBlocked(false)}>
          {blocked?.length ? (
            blocked.map((p) => (
              <div className="beta-row" key={p.id}>
                <Photo profile={p} className="avatar" />
                <b>{p.name}</b>
                <button disabled={working} className="text-link" onClick={() => unblock(p.id)}>
                  {t('Desbloquear')}
                </button>
              </div>
            ))
          ) : (
            <p>{t('No tienes perfiles bloqueados.')}</p>
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
        support
          ? t('CONTACTAR SOPORTE')
          : verification
            ? t('VERIFICA QUE ERES TÚ')
            : t('ONLYFACHOS PRO')
      }
      className="service-modal"
      onClose={onClose}
    >
      <span className="label-strip">{t('BETA 1')}</span>
      {verification ? (
        <Camera size={45} />
      ) : support ? (
        <MessageCircle size={45} />
      ) : (
        <Sparkles size={45} />
      )}
      <h1>
        {support
          ? t('TE LEEMOS.')
          : verification
            ? t('PERSONAS REALES.')
            : t('MÁS CONEXIONES. MÁS TÚ.')}
      </h1>
      <p>
        {support
          ? t(
              'Cuéntanos el problema o una idea. Tu mensaje queda en la bandeja privada del operador. No adjuntes contraseñas ni documentos.',
            )
          : verification
            ? t(
                'Estamos preparando una verificación segura. Todavía no hay proveedor activo: no pedimos selfies ni documentos y no concedemos insignias. Puedes seguir usando la app.',
              )
            : t(
                'La beta es gratuita. Estamos evaluando filtros avanzados, estadísticas y personalización. Aún no hay planes, pagos ni suscripciones activas.',
              )}
      </p>
      {!support && !verification && (
        <div className="beta-group">
          <div className="beta-row">
            <b>{t('Referentes compartidos')}</b>
            <span>{t('Incluido en beta')}</span>
          </div>
          <div className="beta-row">
            <b>{t('Chat directo y citas')}</b>
            <Check size={18} />
          </div>
          <div className="beta-row">
            <b>{t('Visitas a tu perfil')}</b>
            <Check size={18} />
          </div>
        </div>
      )}
      <form className="form" onSubmit={send}>
        {support && (
          <label>
            {t('Tu mensaje')}
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
              ? t('Mensaje registrado. Puedes cerrar esta ventana.')
              : t('Interés registrado. Gracias por ayudarnos a definir lo que viene.')}
          </p>
        ) : (
          <Button disabled={busy}>{support ? t('ENVIAR MENSAJE') : t('ME INTERESA')}</Button>
        )}
        <button type="button" className="text-link" onClick={onClose}>
          {t('Seguir explorando')}
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
      <span className="label-strip">{t('A TU MEDIDA')}</span>
      <h4>
        {t('EDAD · ')}
        {d.minAge} — {d.maxAge}
        {t(' AÑOS')}
      </h4>
      <label>
        {t('Desde ')}
        {d.minAge}
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
        {t('Hasta ')}
        {d.maxAge}
        <input
          type="range"
          min={d.minAge}
          max={100}
          value={d.maxAge}
          onChange={(e) => set({ ...d, maxAge: +e.target.value })}
        />
      </label>
      <label>
        {t('Quiero conocer')}
        <select value={d.gender} onChange={(e) => set({ ...d, gender: e.target.value })}>
          <option value="todos">{t('Todas las personas')}</option>
          <option value="mujer">{t('Mujeres')}</option>
          <option value="hombre">{t('Hombres')}</option>
          <option value="otro">{t('Otro')}</option>
        </select>
      </label>
      <label>
        {t('Ciudad')}
        <input
          maxLength={60}
          placeholder={t('Cualquier ciudad')}
          value={d.city}
          onChange={(e) => set({ ...d, city: e.target.value })}
        />
      </label>
      <p className="hint">
        {t('«Cerca» usa tu misma ciudad. La distancia en kilómetros todavía no está disponible.')}
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
          {t(label)}
          <select value={d[key] || ''} onChange={(e) => set({ ...d, [key]: e.target.value })}>
            <option value="">{t('Cualquiera')}</option>
            {choices.map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Toggle
        label={t('Referentes en común')}
        checked={d.shared === 'true'}
        onChange={(v) => set({ ...d, shared: String(v) })}
      />
      <Toggle
        label={t('Solo verificados')}
        hint={t('Aún no hay verificación activa en esta beta')}
        checked={d.verified === 'true'}
        onChange={(v) => set({ ...d, verified: String(v) })}
      />
      {error && <p role="alert">{t(error)}</p>}
      <Button>
        {t('VER ')}
        {count ?? '…'}
        {t(' PERFILES')}
      </Button>
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
        {t('Restablecer filtros')}
      </button>
    </form>
  );
}

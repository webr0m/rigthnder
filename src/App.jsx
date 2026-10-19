import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  Coffee,
  Download,
  LoaderCircle,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { api, setToken } from './api';
import { googleLogin, listenGoogle, startAds, privacyAds } from './mobile';
import { Button, Modal, Photo, Safety, Legal, locationLabel } from './Shared';
import Onboarding from './Onboarding';
import Conversations from './Conversations';
export function Wordmark() {
  return (
    <span className="wordmark">
      ONLY<span>FACHOS</span>
    </span>
  );
}
const DEFAULT = { minAge: 18, maxAge: 60, gender: 'todos', city: '' };
const MODES = [
  ['all', 'Para ti'],
  ['online', 'En línea'],
  ['shared', 'Ven lo mismo'],
  ['near', 'Cerca'],
];
const NAV = [
  ['community', Users, 'Comunidad'],
  ['chat', MessageCircle, 'Chats'],
  ['profile', UserRound, 'Perfil'],
];
export function ProfileCard({ profile: p, onWrite, onSafety }) {
  const c = p.community || {},
    photos = c.photos?.length ? c.photos : p.photo ? [p.photo] : [];
  const facts = [
    ['DE DERECHA', c.years],
    [
      'FE',
      c.faith === 'Sí' ? c.denomination || 'Creyente' : c.faith === 'No' ? 'No creyente' : c.faith,
    ],
    ['HIJOS', c.children === 'Sí' ? 'Quiere' : c.children],
    [
      'IDIOMAS',
      c.languages
        ?.map(
          (l) =>
            ({
              Español: 'ES',
              Inglés: 'EN',
              Alemán: 'DE',
              Portugués: 'PT',
              Francés: 'FR',
              Italiano: 'IT',
            })[l.language] || l.language.slice(0, 2).toUpperCase(),
        )
        .join(' · '),
    ],
    ['VIAJÓ', c.countryCount ? c.countryCount + ' países' : ''],
    ['PARTIDO', c.party ? c.partyStance + ' ' + c.party : c.partyStance],
  ];
  return (
    <article className="profile-card" id={'person-' + p.id} aria-labelledby={'name-' + p.id}>
      <header className="profile-card-heading">
        <span className={'profile-avatar' + (p.online ? ' is-online' : '')}>
          <Photo profile={p} className="avatar" />
          {p.online && <i aria-label={p.demo ? 'En línea en la demo' : 'En línea'} />}
        </span>
        <div className="profile-name">
          <h2 id={'name-' + p.id}>
            {p.name}, {p.age}
            {p.demo && <small>DEMO</small>}
          </h2>
          <span className="current-tag">{c.current || 'Ideas propias'}</span>
          <p>
            {p.occupation || 'Con ganas de conversar'} · {locationLabel(p)}
          </p>
        </div>
        <Button
          className="write-button"
          aria-label={'Escribir a ' + p.name}
          onClick={() => onWrite(p)}
        >
          <MessageCircle size={14} /> Escribir
        </Button>
        <button
          className="icon-button card-options"
          aria-label={'Opciones de ' + p.name}
          onClick={() => onSafety(p)}
        >
          <MoreHorizontal size={18} />
        </button>
      </header>
      <div className={'profile-gallery gallery-' + Math.min(3, photos.length)}>
        {photos.length ? (
          photos
            .slice(0, 3)
            .map((photo, i) => (
              <img
                key={photo + i}
                loading="lazy"
                src={photo}
                alt={
                  p.demo && i
                    ? 'Plan ilustrativo de ' + p.name
                    : 'Foto ' + (i + 1) + ' de ' + p.name
                }
              />
            ))
        ) : (
          <Photo profile={p} />
        )}
      </div>
      <div className="profile-card-body">
        <p className="profile-bio">
          {p.bio || 'Todavía está preparando su presentación. Rompe el hielo con un hola.'}
        </p>
        {!!p.common?.length && (
          <div className="common-row">
            <strong>{p.common.length} EN COMÚN</strong>
            <div>
              {p.common.slice(0, 4).map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>
        )}
        <dl className="profile-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || 'Sin compartir'}</dd>
            </div>
          ))}
        </dl>
        <div className="consumption">
          {[
            ['VE', c.streamers],
            ['LEE', c.authors],
            ['SIGUE', c.creators],
          ]
            .filter(([, v]) => v?.length)
            .map(([label, items]) => (
              <div key={label}>
                <strong>{label}</strong>
                <div>
                  {items.map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
              </div>
            ))}
        </div>
        {!!c.nationalities?.filter(Boolean).length && (
          <p className="profile-footnote">
            {c.nationalities.filter(Boolean).join(' · ')}
            {c.languages?.length > 0 &&
              ' / ' + c.languages.map((l) => l.language + ' ' + l.level.toLowerCase()).join(' · ')}
          </p>
        )}
      </div>
    </article>
  );
}
function Filters({ filters, onApply }) {
  const [d, set] = useState(filters);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(d);
      }}
    >
      <p>«Cerca» muestra personas de tu misma ciudad, sin usar tu ubicación exacta.</p>
      <div className="form-row">
        <label>
          Edad mínima
          <input
            required
            type="number"
            min={18}
            max={100}
            value={d.minAge}
            onChange={(e) => set({ ...d, minAge: e.target.value })}
          />
        </label>
        <label>
          Edad máxima
          <input
            required
            type="number"
            min={d.minAge}
            max={100}
            value={d.maxAge}
            onChange={(e) => set({ ...d, maxAge: e.target.value })}
          />
        </label>
      </div>
      <label>
        Quiero conocer
        <select value={d.gender} onChange={(e) => set({ ...d, gender: e.target.value })}>
          <option value="todos">Todas las personas</option>
          <option value="mujer">Mujeres</option>
          <option value="hombre">Hombres</option>
          <option value="otro">Otras identidades</option>
        </select>
      </label>
      <label>
        Ciudad
        <input
          maxLength={60}
          value={d.city}
          onChange={(e) => set({ ...d, city: e.target.value })}
          placeholder="Cualquier ciudad"
        />
      </label>
      <Button>APLICAR FILTROS</Button>
      <button type="button" className="text-link" onClick={() => set(DEFAULT)}>
        Restablecer
      </button>
    </form>
  );
}
function Access({ options, notify, onLogin, onRegister, onLegal }) {
  const [login, setLogin] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!login) return onRegister(data);
    setBusy(true);
    try {
      onLogin(await api('/auth/login', { method: 'POST', body: data }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-layout">
      <section className="access-editorial">
        <Wordmark />
        <div className="access-copy">
          <p className="eyebrow">
            <i /> +18 · SIN SWIPES · SOLO CONVERSACIÓN
          </p>
          <h1>
            CONOCE GENTE
            <br />
            <mark>BASADA</mark>
            <span className="red-asterisk">✳</span>
          </h1>
          <p>
            Scrollea perfiles, mira a quién ve, qué lee y qué piensa. Si te convence, escríbele.
          </p>
          <div className="access-steps">
            <span>
              01 <b>SCROLLEA</b>
            </span>
            <span>
              02 <b>CONVERSA</b>
            </span>
            <span>
              03 <b>QUEDA</b>
            </span>
          </div>
        </div>
        <span className="access-note">Las buenas ideas merecen una buena compañía.</span>
      </section>
      <section className="access-form">
        <span className="label-strip">
          {login ? 'TU COMUNIDAD TE ESPERA' : 'AQUÍ EMPIEZA LA CONVERSACIÓN'}
        </span>
        <h2>{login ? 'DE VUELTA.' : 'SIN RODEOS.'}</h2>
        <form className="form" onSubmit={submit}>
          <button
            type="button"
            className="social-login"
            onClick={() => notify('Apple aún no está habilitado. Puedes continuar con tu correo.')}
          >
            ● <span>Continuar con Apple</span>
          </button>
          <button
            type="button"
            className="social-login google"
            onClick={async () => {
              try {
                if (!options.googleEnabled)
                  return notify('Google aún no está habilitado. Puedes continuar con tu correo.');
                await googleLogin();
              } catch (e) {
                notify(e.message, true);
              }
            }}
          >
            <b>G</b>
            <span>Continuar con Google</span>
          </button>
          <div className="form-divider">
            <span />O CON CORREO
            <span />
          </div>
          <label>
            Correo
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              required
              minLength={login ? 1 : 10}
              maxLength={128}
              placeholder={login ? 'Tu contraseña' : 'Mínimo 10 caracteres'}
              autoComplete={login ? 'current-password' : 'new-password'}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? <LoaderCircle className="spin" /> : login ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
          </Button>
          <p className="auth-switch">
            {login ? '¿Primera vez por aquí?' : '¿Ya tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setLogin(!login);
                setError('');
              }}
            >
              {login ? 'Crea tu cuenta' : 'Inicia sesión'}
            </button>
          </p>
          <p className="hint">
            Solo mayores de 18 años. Revisa los{' '}
            <button type="button" className="inline-link" onClick={() => onLegal('terms')}>
              Términos
            </button>{' '}
            y la{' '}
            <button type="button" className="inline-link" onClick={() => onLegal('privacy')}>
              Política de privacidad
            </button>
            .
          </p>
        </form>
        {options.demoEnabled && (
          <button
            className="demo-entry"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                onLogin(await api('/auth/demo', { method: 'POST' }));
              } catch (e) {
                notify(e.message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            Explorar la demostración <ArrowRight size={16} />
          </button>
        )}
      </section>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [options, setOptions] = useState({}),
    [ready, setReady] = useState(false),
    [initError, setInitError] = useState('');
  const [tab, setTab] = useState('community'),
    [mode, setMode] = useState('all'),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [filters, setFilters] = useState(DEFAULT);
  const [feed, setFeed] = useState({ profiles: [], online: [], hasMore: false }),
    [feedBusy, setFeedBusy] = useState(false),
    [feedError, setFeedError] = useState(''),
    [pageError, setPageError] = useState(''),
    [reload, setReload] = useState(0);
  const [conversations, setConversations] = useState([]),
    [active, setActive] = useState(null),
    [modal, setModal] = useState(null),
    [wizard, setWizard] = useState(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(null);
  const [findPerson, setFindPerson] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('onlyfachos-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const sentinel = useRef(null),
    version = useRef(0),
    toastTimer = useRef(),
    scroll = useRef(0),
    chatOrigin = useRef('chat');
  function notify(message, error = false) {
    clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }
  function signedIn(r) {
    setToken(r.token);
    setUser(r.user);
    setTab('community');
    setWizard(null);
    setFilters({ ...DEFAULT, gender: r.user.lookingFor });
    setActive(null);
    setReload((v) => v + 1);
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0d0d11' : '#f2efe6');
    try {
      localStorage.setItem('onlyfachos-theme', theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    let alive = true,
      unlisten;
    (async () => {
      try {
        const config = await api('/options');
        if (!alive) return;
        setOptions(config);
        const q = new URLSearchParams(location.search);
        if (q.get('google') === 'complete') {
          const pending = await api('/auth/google/pending');
          if (alive) setWizard({ type: 'google', ...pending });
        } else {
          try {
            const me = await api('/me');
            if (alive) {
              setUser(me);
              setFilters({ ...DEFAULT, gender: me.lookingFor });
              if (location.pathname === '/eliminar-cuenta') setTab('profile');
            }
          } catch {}
        }
        if (q.get('oauth_error')) notify(q.get('oauth_error'), true);
        if (q.has('google') || q.has('oauth_error'))
          history.replaceState({}, '', location.pathname);
        if (location.pathname === '/privacidad') setModal('privacy');
        if (location.pathname === '/terminos') setModal('terms');
      } catch (e) {
        if (alive) setInitError(e.message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    listenGoogle(
      (r) => (r.ticket ? setWizard({ type: 'google', ...r }) : signedIn(r)),
      (m) => notify(m, true),
    ).then((fn) => (unlisten = fn));
    return () => {
      alive = false;
      unlisten?.();
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  async function refresh() {
    const items = await api('/conversations');
    setConversations(items);
    return items;
  }
  useEffect(() => {
    if (!user) return;
    refresh().catch((e) => notify(e.message, true));
    const t = setInterval(() => refresh().catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [user?.id]);
  const params = new URLSearchParams({ ...filters, mode, q: query }).toString();
  useEffect(() => {
    if (!user) return;
    const v = ++version.current;
    setFeedBusy(true);
    setFeedError('');
    setPageError('');
    api('/community/profiles?' + params)
      .then((r) => {
        if (v === version.current) setFeed({ ...r, requestKey: params });
      })
      .catch((e) => {
        if (v === version.current) setFeedError(e.message);
      })
      .finally(() => {
        if (v === version.current) setFeedBusy(false);
      });
  }, [user?.id, params, reload]);
  async function more() {
    if (feedBusy || !feed.hasMore) return;
    const v = version.current;
    setFeedBusy(true);
    setPageError('');
    try {
      const r = await api('/community/profiles?' + params + '&offset=' + feed.nextOffset);
      if (v === version.current)
        setFeed((f) => ({
          ...r,
          requestKey: params,
          profiles: [
            ...f.profiles,
            ...r.profiles.filter((p) => !f.profiles.some((s) => s.id === p.id)),
          ],
        }));
    } catch (e) {
      if (v === version.current) {
        setFindPerson(null);
        setPageError(e.message);
      }
    } finally {
      if (v === version.current) setFeedBusy(false);
    }
  }
  useEffect(() => {
    if (!sentinel.current || tab !== 'community' || feedBusy || pageError || !feed.hasMore) return;
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) more();
      },
      { rootMargin: '300px' },
    );
    o.observe(sentinel.current);
    return () => o.disconnect();
  }, [tab, feedBusy, pageError, feed.hasMore, feed.nextOffset]);
  useEffect(() => {
    if (!findPerson || tab !== 'community' || feedBusy || feed.requestKey !== params) return;
    const card = document.getElementById('person-' + findPerson);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFindPerson(null);
    } else if (feed.hasMore && !feedError && !pageError) more();
    else {
      setFindPerson(null);
      if (!feedError) notify('Este perfil ya no está disponible.');
    }
  }, [findPerson, tab, feedBusy, feed, params, feedError, pageError]);
  useLayoutEffect(() => {
    if (user && !wizard)
      window.scrollTo({ top: tab === 'community' ? scroll.current : 0, behavior: 'instant' });
  }, [tab, user?.id, !!wizard]);
  function navigate(next) {
    if (tab === 'community') scroll.current = window.scrollY;
    if (next !== 'community') setFindPerson(null);
    setTab(next);
  }
  async function write(p) {
    if (busy) return;
    setBusy(true);
    try {
      const c = await api('/conversations', { method: 'POST', body: { targetId: p.id } });
      await refresh();
      setActive(c.id);
      setModal(null);
      chatOrigin.current = 'community';
      navigate('chat');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  async function saveWizard(data) {
    setBusy(true);
    try {
      if (wizard.type === 'edit') {
        const next = await api('/me', {
          method: 'PUT',
          body: {
            ...user,
            ...data,
            values: user.values || [],
            interests: user.interests || [],
            intention: user.intention || 'Conocer personas',
            prompt: user.prompt || 'Mi primera cita ideal sería…',
            answer: user.answer || '',
            photo: undefined,
          },
        });
        setUser(next);
        setWizard(null);
        setReload((v) => v + 1);
        notify('Perfil guardado. Ya tiene tu toque.');
      } else {
        signedIn(
          await api(wizard.type === 'google' ? '/auth/google/complete' : '/auth/register', {
            method: 'POST',
            body: {
              ...wizard.credentials,
              ...data,
              ...(wizard.ticket ? { ticket: wizard.ticket } : {}),
            },
          }),
        );
        notify('Bienvenido a la comunidad.');
      }
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setToken('');
      setUser(null);
      setConversations([]);
      setFeed({ profiles: [], online: [], hasMore: false });
      setActive(null);
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function exportData() {
    try {
      const r = await api('/me/export');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'onlyfachos-mis-datos.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      notify(e.message, true);
    }
  }
  const safety = (p) => setModal({ type: 'safety', profile: p });
  if (!ready || initError)
    return (
      <div className="boot">
        <Wordmark />
        {initError ? (
          <>
            <p>{initError}</p>
            <Button onClick={() => location.reload()}>Volver a intentar</Button>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>Preparando buenas conversaciones…</p>
          </>
        )}
      </div>
    );
  return (
    <div
      className={`app view-${tab} ${!user ? 'is-access' : ''} ${tab === 'chat' && active ? 'chat-open' : ''}`}
    >
      {!user && !wizard ? (
        <>
          <button
            className="theme-access icon-button"
            aria-label="Cambiar tema"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          <Access
            options={options}
            notify={notify}
            onLogin={signedIn}
            onRegister={(credentials) => setWizard({ type: 'create', credentials })}
            onLegal={setModal}
          />
        </>
      ) : wizard ? (
        <div className="onboarding-shell">
          <div className="onboarding-brand">
            <Wordmark />
          </div>
          <Onboarding
            key={wizard.type}
            user={wizard.type === 'edit' ? user : null}
            identity={wizard.identity}
            onSave={saveWizard}
            onCancel={() => setWizard(null)}
            busy={busy}
          />
          <aside className="onboarding-aside">
            <span className="eyebrow">TU PERFIL. TUS REGLAS.</span>
            <h2>
              QUE TE CONOZCAN
              <br />
              POR LO QUE
              <br />
              <mark>PIENSAS.</mark>
            </h2>
            <p>No solo por una foto. Comparte tus referentes, tus planes y lo que te hace tú.</p>
            <ShieldCheck />
            <p className="hint">Tú eliges qué publicar. Política y religión son opcionales.</p>
          </aside>
        </div>
      ) : (
        <>
          <aside className="desktop-nav">
            <button onClick={() => navigate('community')} aria-label="OnlyFachos inicio">
              <Wordmark />
            </button>
            <p className="sidebar-tagline">
              SIN SWIPES.
              <br />
              CON ALGO QUE DECIR.
            </p>
            <nav aria-label="Navegación principal">
              {NAV.map(([id, Icon, label]) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => navigate(id)}
                >
                  <Icon size={20} />
                  {label}
                  {id === 'chat' && conversations.length > 0 && (
                    <small>{conversations.length}</small>
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-manifesto">
              <span>01 / CONEXIONES CON IDEAS</span>
              <p>
                MENOS DESLIZAR.
                <br />
                <mark>MÁS HABLAR.</mark>
              </p>
            </div>
            <button className="sidebar-account" onClick={() => navigate('profile')}>
              <Photo profile={user} className="avatar" />
              <span>
                {user.name}
                <small>{user.demo ? 'Perfil demo' : 'Mi cuenta'}</small>
              </span>
            </button>
          </aside>
          <div className="app-workspace">
            <header className="community-header">
              <button
                className="brand-button"
                aria-label="Ir a la comunidad"
                onClick={() => navigate('community')}
              >
                <Wordmark />
              </button>
              <div className="header-search">
                <Search size={16} />
                <input
                  aria-label="Buscar personas o ciudad"
                  placeholder="Busca una persona o ciudad…"
                  value={search}
                  maxLength={60}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (tab !== 'community') navigate('community');
                  }}
                />
              </div>
              <div className="header-actions">
                <button
                  className="icon-button theme-toggle"
                  aria-label="Cambiar tema"
                  title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  className="icon-button activity-button"
                  aria-label="Ver invitaciones y actividad"
                  onClick={() => setModal('activity')}
                >
                  <Bell size={20} />
                  {conversations.some((c) => c.invitations.length) && <i />}
                </button>
              </div>
            </header>
            {user.demo && (
              <div className="demo-banner">
                <span>DEMO · Perfiles ficticios, fotos ilustrativas y respuestas simuladas.</span>
                <button onClick={() => setModal('create')}>
                  Crear mi cuenta <ArrowRight size={12} />
                </button>
              </div>
            )}
            <main className={'page page-' + tab}>
              <div hidden={tab !== 'community'} className="community-layout">
                <div className="feed-column">
                  <div className="mobile-search">
                    <Search size={17} />
                    <input
                      aria-label="Buscar en la comunidad"
                      placeholder="Busca por streamer, autor, ciudad…"
                      maxLength={60}
                      value={search}
                      onChange={(e) => {
                        setFindPerson(null);
                        setSearch(e.target.value);
                      }}
                    />
                  </div>
                  <div className="feed-toolbar">
                    <div className="feed-tabs" role="tablist" aria-label="Filtrar comunidad">
                      {MODES.map(([id, label]) => (
                        <button
                          key={id}
                          role="tab"
                          aria-selected={id === mode}
                          className={id === mode ? 'active' : ''}
                          onClick={() => {
                            setMode(id);
                            setFindPerson(null);
                            scroll.current = 0;
                            window.scrollTo({ top: 0 });
                          }}
                        >
                          {label}
                          {id === 'online' && <i />}
                        </button>
                      ))}
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Filtrar perfiles"
                      onClick={() => setModal('filters')}
                    >
                      <SlidersHorizontal size={18} />
                    </button>
                  </div>
                  <section className="online-section" aria-label="Personas en línea">
                    <div className="online-title">
                      <i /> EN LÍNEA {user.demo ? 'EN LA DEMO' : 'AHORA'}{' '}
                      <b>· {feed.online.length}</b>
                    </div>
                    <div className="online-people">
                      {feed.online.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setMode('all');
                            setSearch('');
                            setQuery('');
                            setFindPerson(p.id);
                          }}
                        >
                          <span>
                            <Photo profile={p} />
                            <i />
                          </span>
                          <small>{p.name}</small>
                        </button>
                      ))}
                      {!feed.online.length && (
                        <p className="hint">Aparecerán aquí cuando estén activas.</p>
                      )}
                    </div>
                  </section>
                  {user.demo && (
                    <p className="mobile-demo-note">
                      DEMO · Perfiles ficticios y respuestas simuladas.
                    </p>
                  )}
                  <div className="feed-caption">
                    <span>
                      {mode === 'near'
                        ? 'MISMA CIUDAD · ' + user.city
                        : mode === 'shared'
                          ? 'REFERENTES EN COMÚN'
                          : 'PERFILES CON ALGO QUE DECIR'}
                    </span>
                    <small>{feed.total || 0} perfiles</small>
                  </div>
                  {feedError ? (
                    <div className="empty-state">
                      <h2>No pudimos cargar el feed.</h2>
                      <p>{feedError}</p>
                      <Button onClick={() => setReload((v) => v + 1)}>VOLVER A INTENTAR</Button>
                    </div>
                  ) : (
                    <>
                      <section
                        className="profile-feed"
                        aria-label="Perfiles de la comunidad"
                        aria-busy={feedBusy}
                      >
                        {feed.profiles.map((p) => (
                          <ProfileCard profile={p} onWrite={write} onSafety={safety} key={p.id} />
                        ))}
                      </section>
                      {feedBusy && (
                        <div className="loading">
                          <LoaderCircle className="spin" /> Cargando perfiles…
                        </div>
                      )}
                      {!feedBusy && !feed.profiles.length && (
                        <div className="empty-state">
                          <Search size={28} />
                          <h2>AÚN NO HAY NADIE POR AQUÍ.</h2>
                          <p>Prueba otra pestaña o amplía tus filtros.</p>
                          <Button
                            onClick={() => {
                              setSearch('');
                              setMode('all');
                              setFilters({ ...DEFAULT });
                            }}
                          >
                            VER TODA LA COMUNIDAD
                          </Button>
                        </div>
                      )}
                      <div ref={sentinel} />
                      {pageError && (
                        <p className="form-error" role="alert">
                          {pageError}. Puedes reintentar sin perder los perfiles que ya cargaron.
                        </p>
                      )}
                      {feed.hasMore && (
                        <button className="load-more" disabled={feedBusy} onClick={more}>
                          Cargar más perfiles
                        </button>
                      )}
                      {!feedBusy && !feed.hasMore && feed.profiles.length > 0 && (
                        <div className="feed-end">
                          <span>✳</span>
                          <strong>ESTÁS AL DÍA.</strong>
                          <p>Una buena conversación puede empezar más arriba.</p>
                          <button
                            className="text-link"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          >
                            Volver al inicio ↑
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <aside className="feed-aside">
                  <span className="label-strip">ASÍ FUNCIONA</span>
                  <h1>
                    PRIMERO EL HOLA.
                    <br />
                    <mark>DESPUÉS LA CITA.</mark>
                  </h1>
                  <ol>
                    {[
                      [
                        'Scrollea sin descartar.',
                        'Mira fotos, ideas y referentes. No hay que votar por cada perfil.',
                      ],
                      [
                        'Escribe cuando conectes.',
                        'El chat es directo. No necesitas un like ni un match previo.',
                      ],
                      [
                        'Que el plan sea de los dos.',
                        'Solo es una cita cuando la otra persona acepta tu invitación.',
                      ],
                    ].map(([title, text], i) => (
                      <li key={title}>
                        <b>0{i + 1}</b>
                        <div>
                          <strong>{title}</strong>
                          <p>{text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="aside-safety">
                    <ShieldCheck size={20} />
                    <p>
                      Tu espacio, tus límites.
                      <br />
                      Puedes bloquear y denunciar.
                    </p>
                  </div>
                  <div className="community-footnotes">
                    <button onClick={() => setModal('privacy')}>Privacidad</button>
                    <button onClick={() => setModal('terms')}>Términos</button>
                    <small>ONLYFACHOS © {new Date().getFullYear()}</small>
                  </div>
                </aside>
              </div>
              {tab === 'chat' && (
                <Conversations
                  user={user}
                  conversations={conversations}
                  active={active}
                  setActive={(id) => {
                    chatOrigin.current = 'chat';
                    setActive(id);
                  }}
                  backToCommunity={chatOrigin.current === 'community'}
                  onBack={() => {
                    setActive(null);
                    if (chatOrigin.current === 'community') navigate('community');
                  }}
                  refresh={refresh}
                  notify={notify}
                  safety={safety}
                  onDiscover={() => navigate('community')}
                />
              )}
              {tab === 'profile' && (
                <div className="account-layout">
                  <section className="account-main">
                    <span className="label-strip">TU ESPACIO</span>
                    <h1>
                      ESTO ES <mark>MUY TÚ.</mark>
                    </h1>
                    <div className="my-profile-summary">
                      <Photo profile={user} className="large-avatar" />
                      <div>
                        <h2>
                          {user.name}, {user.age}
                        </h2>
                        <p>
                          {locationLabel(user)} ·{' '}
                          {user.demo ? 'Perfil de demostración' : user.email}
                        </p>
                        <Button onClick={() => setWizard({ type: 'edit' })}>
                          EDITAR MI PERFIL <ArrowRight size={16} />
                        </Button>
                      </div>
                    </div>
                    <ProfileCard
                      profile={{ ...user, common: [] }}
                      onWrite={() => notify('Así ven tu perfil las personas de la comunidad.')}
                      onSafety={() => setModal('privacy')}
                    />
                    <p className="hint">
                      Tu correo y fecha de nacimiento no se muestran en el perfil público.
                    </p>
                  </section>
                  <aside className="account-settings">
                    <h3>
                      TUS DATOS.
                      <br />
                      TUS DECISIONES.
                    </h3>
                    <p>
                      Política y religión son opcionales. Puedes quitarlas en «Editar mi perfil».
                    </p>
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      <Sun size={18} /> Apariencia: {theme === 'dark' ? 'oscura' : 'clara'}
                    </button>
                    <button onClick={() => setModal('privacy')}>
                      <ShieldCheck size={18} /> Privacidad
                    </button>
                    <button onClick={exportData}>
                      <Download size={18} /> Descargar mis datos
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          notify(await startAds());
                        } catch (e) {
                          notify(e.message, true);
                        }
                      }}
                    >
                      <Zap size={18} /> Anuncios en móvil
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await privacyAds();
                        } catch (e) {
                          notify(e.message, true);
                        }
                      }}
                    >
                      <SlidersHorizontal size={18} /> Privacidad de anuncios
                    </button>
                    <button onClick={logout}>
                      <LogOut size={18} /> Cerrar sesión
                    </button>
                    <button className="danger-text" onClick={() => setModal('delete')}>
                      Eliminar mi cuenta
                    </button>
                  </aside>
                </div>
              )}
            </main>
          </div>
          <nav className="bottom-nav" aria-label="Navegación móvil">
            {NAV.map(([id, Icon, label]) => (
              <button
                key={id}
                aria-current={tab === id ? 'page' : undefined}
                className={tab === id ? 'active' : ''}
                onClick={() => {
                  if (id === 'chat' && tab === 'chat') setActive(null);
                  if (id === 'chat') chatOrigin.current = 'chat';
                  navigate(id);
                }}
              >
                <span>
                  <Icon size={20} />
                  {id === 'chat' && conversations.length > 0 && (
                    <small>{conversations.length}</small>
                  )}
                </span>
                {label}
              </button>
            ))}
          </nav>
        </>
      )}
      {modal === 'filters' && (
        <Modal title="TU COMUNIDAD, A TU MANERA" onClose={() => setModal(null)}>
          <Filters
            filters={filters}
            onApply={(v) => {
              setFilters(v);
              setModal(null);
            }}
          />
        </Modal>
      )}
      {(modal === 'privacy' || modal === 'terms') && (
        <Modal
          title={modal === 'privacy' ? 'TU PRIVACIDAD' : 'NORMAS DE COMUNIDAD'}
          onClose={() => setModal(null)}
        >
          <Legal type={modal} />
        </Modal>
      )}
      {modal?.type === 'safety' && (
        <Modal title="TÚ PONES LOS LÍMITES" onClose={() => setModal(null)}>
          <Safety
            profile={modal.profile}
            notify={notify}
            onDone={() => {
              setModal(null);
              setActive(null);
              refresh();
              setReload((v) => v + 1);
            }}
          />
        </Modal>
      )}
      {modal === 'create' && (
        <Modal title="TU PRÓXIMA CONVERSACIÓN" onClose={() => setModal(null)}>
          <p>
            Estás explorando la demo. Para conectar con personas reales, cierra esta sesión y crea
            tu propia cuenta.
          </p>
          <Button
            onClick={async () => {
              await logout();
              setModal(null);
            }}
          >
            CREAR MI CUENTA
          </Button>
        </Modal>
      )}
      {modal === 'activity' && (
        <Modal title="LO QUE ESTÁ PASANDO" onClose={() => setModal(null)}>
          <div className="activity-list">
            {conversations
              .filter((c) => c.invitations.length)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActive(c.id);
                    setModal(null);
                    navigate('chat');
                  }}
                >
                  <Photo profile={c.profile} className="avatar" />
                  <span>
                    {c.profile.name}
                    <small>
                      {c.invitations[0].status === 'accepted'
                        ? '¡Tienen una cita!'
                        : c.invitations[0].status === 'pending'
                          ? 'Invitación pendiente'
                          : 'Pueden seguir conversando'}
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
            {!conversations.some((c) => c.invitations.length) && (
              <div className="empty-state">
                <Coffee size={30} />
                <h3>TODAVÍA NO HAY INVITACIONES.</h3>
                <p>Cuando una conversación se convierta en un plan, lo verás aquí.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="ELIMINAR MI CUENTA" onClose={() => setModal(null)}>
          <p>
            Se eliminarán tu perfil, fotos, conversaciones e invitaciones de la base activa. Esta
            acción no se puede deshacer.
          </p>
          <Button
            className="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/me', { method: 'DELETE' });
                setToken('');
                setUser(null);
                setModal(null);
                setConversations([]);
                notify('Tu cuenta y sus datos se eliminaron.');
              } catch (e) {
                notify(e.message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            SÍ, ELIMINAR MI CUENTA
          </Button>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? 'error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <X size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

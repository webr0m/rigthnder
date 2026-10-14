import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  Compass,
  Crown,
  Flag,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Quote,
  RotateCcw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  X,
  Coffee,
  LockKeyhole,
  Download,
  Camera,
  Ban,
  LoaderCircle,
  ExternalLink,
} from 'lucide-react';
import { api, setToken } from './api';
import { googleLogin, listenGoogle, startAds, privacyAds } from './mobile';

const VALUE_LIST = [
  'Libertad',
  'Familia',
  'Tradición',
  'Emprendimiento',
  'Responsabilidad',
  'Patria',
];
const INTEREST_LIST = [
  'Café',
  'Viajes',
  'Trekking',
  'Libros',
  'Música',
  'Deporte',
  'Cocina',
  'Perros',
  'Vino',
  'Arte',
];
const NAV = [
  ['discover', Compass, 'Descubrir'],
  ['matches', Heart, 'Tus matches'],
  ['chat', MessageCircle, 'Conversaciones'],
  ['profile', UserRound, 'Mi perfil'],
];
const IDEAS = [
  ['Café sin prisa', 'Un lugar bonito. Dos cafés. Cero discursos.', '/photos/cafe.jpg'],
  [
    'Una vuelta al aire libre',
    'Un paseo, una buena vista y mucho por conversar.',
    '/photos/coast.jpg',
  ],
  ['Cocina para dos', 'El ingrediente secreto siempre es la compañía.', '/photos/cafe.jpg'],
];
const DEFAULT_FILTERS = { minAge: 18, maxAge: 60, gender: 'todos', city: '', value: '' };

function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? 'small' : ''}`}>
      <svg width="33" height="34" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M5 15C5 4 17 1 20 10 23 1 35 4 35 15c0 10-15 20-15 20S5 25 5 15Z"
          fill="currentColor"
        />
        <path
          d="m17 13 7 6-7 6"
          fill="none"
          stroke="#101010"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        Rigthnder<span className="logo-dot">.</span>
      </span>
    </span>
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
  const ref = useRef(null),
    previous = useRef(document.activeElement);
  useEffect(() => {
    const lastOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button,input,select,a')?.focus();
    function key(event) {
      if (event.key === 'Escape') onClose();
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
  }, [onClose]);
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

export default function App() {
  const [user, setUser] = useState(null),
    [options, setOptions] = useState({}),
    [ready, setReady] = useState(false),
    [initError, setInitError] = useState('');
  const [tab, setTab] = useState('discover'),
    [profiles, setProfiles] = useState([]),
    [matches, setMatches] = useState([]),
    [filters, setFilters] = useState(DEFAULT_FILTERS),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [lastAction, setLastAction] = useState(null),
    [activeMatch, setActiveMatch] = useState(null),
    [googlePending, setGooglePending] = useState(null),
    [authMode, setAuthMode] = useState('register'),
    [idea, setIdea] = useState(0),
    [swipeVisual, setSwipeVisual] = useState('');
  const toastTimer = useRef(),
    swipeStart = useRef(null);
  const deletionPage = window.location.pathname === '/eliminar-cuenta';
  function notify(message, error = false) {
    clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }
  async function fetchProfiles(nextFilters = filters) {
    setProfiles(await api('/profiles?' + new URLSearchParams(nextFilters)));
  }
  async function refreshMatches() {
    setMatches(await api('/matches'));
  }
  function signedIn(result) {
    setToken(result.token);
    setUser(result.user);
    setGooglePending(null);
    setModal(null);
    setTab('discover');
    setProfiles([]);
    setLastAction(null);
    setFilters(DEFAULT_FILTERS);
  }
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await api('/options');
        if (!alive) return;
        setOptions(config);
        const query = new URLSearchParams(location.search);
        if (query.get('google') === 'complete') {
          const pending = await api('/auth/google/pending');
          setGooglePending(pending);
          setModal('auth');
        } else {
          try {
            const me = await api('/me');
            if (alive) {
              setUser(me);
              if (deletionPage) setTab('profile');
            }
          } catch {
            if (config.demoEnabled && !deletionPage && !query.get('oauth_error'))
              signedIn(await api('/auth/demo', { method: 'POST' }));
          }
        }
        if (query.get('oauth_error')) {
          notify(query.get('oauth_error'), true);
          setModal('auth');
          setAuthMode('login');
        }
        if (location.pathname === '/privacidad') setModal('privacy');
        if (location.pathname === '/terminos') setModal('terms');
        if (query.has('google') || query.has('oauth_error'))
          history.replaceState({}, '', location.pathname);
      } catch (error) {
        if (alive) setInitError(error.message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    let unlisten;
    listenGoogle(
      (result) => {
        if (result.ticket) {
          setGooglePending(result);
          setModal('auth');
        } else signedIn(result);
      },
      (message) => notify(message, true),
    ).then((fn) => (unlisten = fn));
    return () => {
      alive = false;
      unlisten?.();
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (user) {
      const preferredFilters = { ...DEFAULT_FILTERS, gender: user.lookingFor };
      setFilters(preferredFilters);
      Promise.all([fetchProfiles(preferredFilters), refreshMatches()]).catch((error) =>
        notify(error.message, true),
      );
    }
  }, [user?.id, user?.lookingFor]);
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => refreshMatches().catch(() => {}), 10_000);
    return () => clearInterval(timer);
  }, [user?.id]);
  async function act(action) {
    if (busy || !profiles[0]) return;
    setBusy(true);
    setSwipeVisual(action);
    try {
      const current = profiles[0];
      const result = await api('/swipes', {
        method: 'POST',
        body: { targetId: current.id, action },
      });
      setProfiles((p) => p.filter((v) => v.id !== current.id));
      setLastAction(result.match ? null : action);
      if (result.match) {
        setModal({ type: 'match', ...result.match });
        await refreshMatches();
      } else if (action !== 'pass')
        notify(
          action === 'super'
            ? '¡Le enviaste un superlike!'
            : 'Like enviado. Si es mutuo, hay match.',
        );
    } catch (error) {
      notify(error.message, true);
    } finally {
      setBusy(false);
      setSwipeVisual('');
    }
  }
  useEffect(() => {
    const key = (e) => {
      if (
        tab !== 'discover' ||
        modal ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)
      )
        return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        act('like');
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        act('pass');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [tab, modal, busy, profiles]);
  async function undo() {
    if (busy) return;
    setBusy(true);
    try {
      await api('/swipes/last', { method: 'DELETE' });
      await fetchProfiles();
      setLastAction(null);
      notify('Volvemos un perfil atrás.');
    } catch (error) {
      notify(error.message, true);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setToken('');
      setUser(null);
      setProfiles([]);
      setMatches([]);
      setActiveMatch(null);
      setTab('discover');
    } catch (error) {
      notify(error.message, true);
    }
  }
  async function applyFilters(value) {
    try {
      setBusy(true);
      await fetchProfiles(value);
      setFilters(value);
      setModal(null);
    } catch (error) {
      notify(error.message, true);
    } finally {
      setBusy(false);
    }
  }
  const current = profiles[0],
    common = current?.values.filter((value) => user?.values.includes(value)) || [];
  const completed = user
    ? [
        user.photo,
        user.bio,
        user.occupation,
        user.answer,
        user.values.length > 1,
        user.interests.length > 1,
      ].filter(Boolean).length
    : 0;
  const progress = Math.round((completed / 6) * 100);
  const navigate = (next) => {
    setTab(next);
    if (next === 'chat' && !activeMatch && matches[0]) setActiveMatch(matches[0].id);
  };
  const openChat = (match) => {
    setActiveMatch(match.id);
    setModal(null);
    setTab('chat');
  };
  const closeModal = () => setModal(null);

  if (!ready)
    return (
      <div className="boot">
        <Logo />
        <LoaderCircle className="spin" />
        <p>Preparando tu próxima buena historia…</p>
      </div>
    );
  if (initError)
    return (
      <div className="boot">
        <Logo />
        <p>{initError}</p>
        <Button onClick={() => location.reload()}>
          Volver a intentar <RotateCcw size={17} />
        </Button>
      </div>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Rigthnder inicio">
          <Logo />
        </a>
        <div className="brand-caption">IDEAS CLARAS. CORAZÓN ABIERTO.</div>
        <div className="nav-label">TU ESPACIO</div>
        <nav aria-label="Navegación principal">
          {NAV.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => (user ? navigate(id) : setModal('auth'))}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === 'matches' && matches.length > 0 && (
                <span className="nav-count">{matches.length}</span>
              )}
              {id === 'chat' && matches.some((m) => m.lastMessage) && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-quote">
          <span className="quote-decoration">“</span>
          <p>
            La química importa.
            <br />
            <strong>Los valores también.</strong>
          </p>
          <div className="short-rule" />
        </div>
        <button className="plus-card" onClick={() => setModal('plus')}>
          <span className="plus-icon">
            <Crown size={22} />
          </span>
          <strong>
            Tu mejor versión.
            <br />
            Más posibilidades.
          </strong>
          <span>
            Descubre Rigthnder Plus <ArrowUpRight size={15} />
          </span>
          <small>PRÓXIMAMENTE</small>
        </button>
        <div className="sidebar-bottom">
          <button className="subtle-button" onClick={() => setModal('help')}>
            <HelpCircle size={16} /> Centro de ayuda <ArrowUpRight size={14} />
          </button>
          <button
            className="sidebar-user"
            onClick={() => (user ? navigate('profile') : setModal('auth'))}
          >
            <Photo profile={user} className="avatar" />
            <span>
              <strong>{user?.name || 'Tu próxima historia'}</strong>
              <small>
                {user?.demo ? 'Explorando la demo' : user ? 'Tu perfil' : 'Crear una cuenta'}
              </small>
            </span>
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo small />
          </div>
          <div className="breadcrumb">
            Tu próxima buena historia <span>/</span>
            <strong>{NAV.find((n) => n[0] === tab)?.[2]}</strong>
          </div>
          <div className="top-actions">
            {user?.demo && (
              <button
                className="demo-pill"
                onClick={() => {
                  setAuthMode('register');
                  setModal('auth');
                }}
              >
                <span /> Modo demo <ArrowUpRight size={13} />
              </button>
            )}
            <button
              className="icon-button notification"
              aria-label="Ver actividad"
              onClick={() => setModal('activity')}
            >
              <Bell size={19} />
              {matches.length > 0 && <i />}
            </button>
            <span className="top-divider" />
            <button
              className="icon-button top-avatar"
              aria-label="Ver mi perfil"
              onClick={() => (user ? navigate('profile') : setModal('auth'))}
            >
              <Photo profile={user} />
            </button>
          </div>
        </header>
        {!user ? (
          <section className="welcome">
            <div className="eyebrow">
              <span /> MISMAS IDEAS. NUEVAS CONEXIONES.
            </div>
            <h1>
              {deletionPage ? (
                'Tú tienes el control.'
              ) : (
                <>
                  El amor también
                  <br />
                  va a la <em>derecha.</em>
                </>
              )}
            </h1>
            <p>
              {deletionPage
                ? 'Para eliminar tu cuenta de Rigthnder y sus datos, inicia sesión y ve a Mi perfil → Eliminar mi cuenta. Puedes hacerlo aquí mismo, sin instalar la app.'
                : 'Una comunidad para quienes creen en la libertad, la familia y las buenas historias. La próxima puede empezar contigo.'}
            </p>
            <Button
              onClick={() => {
                setAuthMode(deletionPage ? 'login' : 'register');
                setModal('auth');
              }}
            >
              {deletionPage ? 'Iniciar sesión' : 'Encontrar mi conexión'}
              <ArrowRight size={18} />
            </Button>
            {options.demoEnabled && !deletionPage && (
              <button
                className="text-link"
                onClick={async () => {
                  try {
                    signedIn(await api('/auth/demo', { method: 'POST' }));
                  } catch (e) {
                    notify(e.message, true);
                  }
                }}
              >
                Explorar la demostración <ArrowUpRight size={16} />
              </button>
            )}
            <div className="welcome-values">
              <ShieldCheck size={19} /> Solo mayores de 18 años · Respeto ante todo
            </div>
            <div className="welcome-legal">
              <a
                href="/privacidad"
                onClick={(e) => {
                  e.preventDefault();
                  setModal('privacy');
                }}
              >
                Privacidad
              </a>
              <a
                href="/terminos"
                onClick={(e) => {
                  e.preventDefault();
                  setModal('terms');
                }}
              >
                Términos
              </a>
            </div>
          </section>
        ) : (
          <>
            <main className="main-content">
              {tab === 'discover' && (
                <>
                  <div className="page-intro">
                    <div>
                      <div className="eyebrow">
                        <span /> MISMAS IDEAS. NUEVAS CONEXIONES.
                      </div>
                      <h1>
                        El amor también
                        <br />
                        va a la <em>derecha.</em>
                        <span className="title-star">✦</span>
                      </h1>
                      <p>Alguien que comparte tus valores. Y te cambia los planes.</p>
                    </div>
                    <button className="filter-button" onClick={() => setModal('filters')}>
                      <SlidersHorizontal size={18} /> Tus preferencias
                      {JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) && (
                        <span className="filter-dot" />
                      )}
                    </button>
                  </div>
                  <div className="discover-grid">
                    <section className="discovery">
                      <div className="section-line">
                        <h2>
                          Personas en tu sintonía <span>PARA TI</span>
                        </h2>
                        <span className="nearby">
                          <MapPin size={14} />
                          {filters.city || user.city}
                        </span>
                      </div>
                      {current ? (
                        <article
                          className={`profile-card ${swipeVisual ? 'swipe-' + swipeVisual : ''}`}
                          key={current.id}
                          onPointerDown={(e) => {
                            if (!e.target.closest('button'))
                              swipeStart.current = { x: e.clientX, y: e.clientY };
                          }}
                          onPointerUp={(e) => {
                            const start = swipeStart.current;
                            swipeStart.current = null;
                            if (
                              start &&
                              Math.abs(e.clientX - start.x) > 90 &&
                              Math.abs(e.clientY - start.y) < 70
                            )
                              act(e.clientX > start.x ? 'like' : 'pass');
                          }}
                        >
                          <div className="profile-image">
                            <Photo profile={current} />
                            <div className="photo-gradient" />
                            <div className="image-top">
                              <span className="image-label">
                                <Sparkles size={14} /> EN TU SINTONÍA
                              </span>
                              <button
                                className="photo-more"
                                aria-label="Opciones del perfil"
                                onClick={() => setModal({ type: 'safety', profile: current })}
                              >
                                <MoreHorizontal size={20} />
                              </button>
                            </div>
                            <div className="image-caption">
                              <div className="photo-pages">
                                <i className="selected" />
                              </div>
                              <h2>
                                {current.name}
                                <span>, {current.age}</span>
                                {current.demo && <span className="demo-photo-label">DEMO</span>}
                              </h2>
                              <p>
                                <MapPin size={15} />
                                {current.city}
                              </p>
                            </div>
                          </div>
                          <div className="profile-details">
                            <div className="connection-tag">
                              <span />
                              <strong>
                                {common.length} {common.length === 1 ? 'valor' : 'valores'} en común
                              </strong>
                              <ArrowUpRight size={16} />
                            </div>
                            <h3>Un poco sobre mí</h3>
                            <p className="occupation">
                              {current.occupation || 'Una nueva persona por conocer'}
                            </p>
                            <p className="bio">
                              {current.bio || 'La mejor forma de conocernos es conversando.'}
                            </p>
                            <h4>LO QUE ME MUEVE</h4>
                            <div className="chips values-chips">
                              {current.values.map((value) => (
                                <span
                                  className={common.includes(value) ? 'shared' : ''}
                                  key={value}
                                >
                                  {value === 'Libertad' ? '↗ ' : value === 'Familia' ? '♡ ' : ''}
                                  {value}
                                </span>
                              ))}
                            </div>
                            <h4>FUERA DEL DEBATE</h4>
                            <div className="chips interest-chips">
                              {current.interests.map((interest) => (
                                <span key={interest}>
                                  {interest === 'Café'
                                    ? '☕ '
                                    : interest === 'Viajes'
                                      ? '✈ '
                                      : interest === 'Trekking'
                                        ? '↟ '
                                        : interest === 'Perros'
                                          ? '♧ '
                                          : ''}
                                  {interest}
                                </span>
                              ))}
                            </div>
                            <div className="prompt">
                              <Quote size={18} />
                              <small>{current.prompt}</small>
                              <p>
                                {current.answer || 'Una conversación que merezca una segunda cita.'}
                              </p>
                            </div>
                            <div className="intention">
                              <Heart size={15} />
                              <span>
                                Busco <strong>{current.intention.toLowerCase()}</strong>
                              </span>
                            </div>
                          </div>
                        </article>
                      ) : (
                        <div className="empty discovery-empty">
                          <Compass size={42} />
                          <h2>Ya viste estos perfiles.</h2>
                          <p>
                            {user.demo
                              ? 'Prueba otras preferencias o vuelve un perfil atrás.'
                              : 'Cuando se unan más personas compatibles, aparecerán aquí. Comparte Rigthnder con tus amigos.'}
                          </p>
                          <Button className="secondary" onClick={() => setModal('filters')}>
                            Ajustar preferencias <SlidersHorizontal size={16} />
                          </Button>
                        </div>
                      )}
                      <div className="swipe-actions">
                        <button
                          className="action-circle undo"
                          aria-label="Deshacer última reacción"
                          disabled={!lastAction || busy}
                          onClick={undo}
                        >
                          <RotateCcw size={21} />
                        </button>
                        <button
                          className="action-circle pass"
                          aria-label="Pasar perfil"
                          disabled={!current || busy}
                          onClick={() => act('pass')}
                        >
                          <X size={30} />
                        </button>
                        <button
                          className="action-circle super"
                          aria-label="Enviar superlike"
                          disabled={!current || busy}
                          onClick={() => act('super')}
                        >
                          <Star size={24} />
                        </button>
                        <button
                          className="action-circle like"
                          aria-label="Me gusta"
                          disabled={!current || busy}
                          onClick={() => act('like')}
                        >
                          <Heart size={29} fill="currentColor" />
                        </button>
                      </div>
                      <p className="keyboard-hint">
                        <kbd>←</kbd> Pasar <span />
                        <kbd>→</kbd> Me gusta <span /> O desliza el perfil
                      </p>
                      {user.demo && (
                        <p className="demo-notice">
                          Estás en una demo: perfiles ficticios, fotos ilustrativas y respuestas
                          simuladas.
                        </p>
                      )}
                    </section>
                    <aside className="discovery-aside">
                      <div className="mini-heading">
                        <span>QUE PASE ALGO BONITO</span>
                        <Sparkles size={15} />
                      </div>
                      <div className="date-card">
                        <img
                          src={IDEAS[idea][2]}
                          alt={
                            idea === 1 ? 'Costa para un paseo' : 'Una taza de café sobre una mesa'
                          }
                        />
                        <div className="date-content">
                          <span className="overline">LA PRIMERA CITA</span>
                          <h3>
                            {IDEAS[idea][0]}
                            <span>↗</span>
                          </h3>
                          <p>{IDEAS[idea][1]}</p>
                          <button
                            className="text-link"
                            onClick={() => setIdea((i) => (i + 1) % IDEAS.length)}
                          >
                            Otro buen plan <ArrowRight size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="values-note">
                        <div className="note-icon">
                          <Heart size={21} />
                          <ArrowUpRight size={18} />
                        </div>
                        <h3>
                          Más conexión.
                          <br />
                          Menos polarización.
                        </h3>
                        <p>
                          Comparte tus ideas.
                          <br />
                          Escucha las suyas.
                          <br />
                          El respeto siempre va primero.
                        </p>
                        <div className="note-footer">
                          <span>EL MATCH EMPIEZA CONTIGO</span>
                          <ShieldCheck size={17} />
                        </div>
                      </div>
                      <button className="profile-progress" onClick={() => navigate('profile')}>
                        <div>
                          <span>TU PERFIL, TU MEJOR CARTA</span>
                          <strong>
                            Deja que te conozcan <ArrowUpRight size={15} />
                          </strong>
                        </div>
                        <div className="progress-track">
                          <i style={{ width: progress + '%' }} />
                        </div>
                        <small>{progress}% completo · Dale tu toque</small>
                      </button>
                    </aside>
                  </div>
                </>
              )}
              {tab === 'matches' && (
                <>
                  <PageHeading
                    eyebrow="CUANDO EL LIKE ES MUTUO"
                    title={
                      <>
                        Aquí empieza <em>lo bueno.</em>
                      </>
                    }
                    text="Las ideas conectaron. Ahora les toca a ustedes."
                  />
                  <div className="matches-grid">
                    {matches.map((match) => (
                      <button className="match-card" key={match.id} onClick={() => openChat(match)}>
                        <Photo profile={match.profile} />
                        <span className="match-card-gradient" />
                        <span className="match-person">
                          <strong>
                            {match.profile.name}, {match.profile.age}
                            <Heart size={18} fill="currentColor" />
                          </strong>
                          <small>{match.profile.city}</small>
                          <span>
                            Abrir conversación <ArrowRight size={17} />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {!matches.length && (
                    <Empty
                      icon={Heart}
                      title="Tu próximo match está por llegar."
                      text="Un like mutuo abre una conversación. Descubre personas que compartan tus valores."
                      action={() => navigate('discover')}
                      actionText="Seguir descubriendo"
                    />
                  )}
                  {user.demo && (
                    <p className="demo-notice">Estos matches forman parte de la demostración.</p>
                  )}
                </>
              )}
              {tab === 'chat' && (
                <>
                  <PageHeading
                    eyebrow="UNA BUENA CONVERSACIÓN LO CAMBIA TODO"
                    title={
                      <>
                        Menos scroll. <em>Más conexión.</em>
                      </>
                    }
                    text="El mejor rompehielos es ser tú."
                  />
                  <Chat
                    user={user}
                    matches={matches}
                    activeMatch={activeMatch}
                    select={setActiveMatch}
                    notify={notify}
                    refresh={refreshMatches}
                    safety={(profile) => setModal({ type: 'safety', profile })}
                    discover={() => navigate('discover')}
                  />
                </>
              )}
              {tab === 'profile' && (
                <>
                  <PageHeading
                    eyebrow="IDEAS CLARAS. CORAZÓN ABIERTO."
                    title={
                      <>
                        Tu mejor <em>primera impresión.</em>
                      </>
                    }
                    text="Tu perfil cuenta una historia. Hazla tuya."
                  />
                  <ProfileEditor
                    user={user}
                    setUser={setUser}
                    notify={notify}
                    onLogout={logout}
                    onDelete={() => setModal('delete')}
                    onPrivacy={() => setModal('privacy')}
                  />
                </>
              )}
            </main>
            <footer className="footer">
              <span>
                © {new Date().getFullYear()} Rigthnder <span className="footer-dot">·</span> El
                amor también va a la derecha.
              </span>
              <div>
                <button onClick={() => setModal('privacy')}>Privacidad</button>
                <button onClick={() => setModal('terms')}>Términos</button>
                <span>
                  HECHO PARA CONECTAR <Heart size={12} />
                </span>
              </div>
            </footer>
          </>
        )}
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {NAV.map(([id, Icon, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => (user ? navigate(id) : setModal('auth'))}
          >
            <Icon size={21} />
            <span>{id === 'chat' ? 'Chat' : label}</span>
            {id === 'matches' && matches.length > 0 && <i>{matches.length}</i>}
          </button>
        ))}
      </nav>
      {toast && (
        <div className={`toast ${toast.error ? 'error' : ''}`} role="status">
          {toast.error ? <Flag size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal === 'filters' && (
        <Modal title="Tu persona, a tu manera" onClose={closeModal}>
          <FilterForm filters={filters} onApply={applyFilters} busy={busy} />
        </Modal>
      )}
      {modal === 'auth' && (
        <Modal
          title={
            googlePending
              ? 'Un último paso para conectar'
              : authMode === 'login'
                ? 'Qué bueno verte de nuevo'
                : 'Tu próxima historia empieza aquí'
          }
          onClose={closeModal}
        >
          <AuthForm
            mode={authMode}
            setMode={setAuthMode}
            googlePending={googlePending}
            googleEnabled={options.googleEnabled}
            onSuccess={signedIn}
            notify={notify}
          />
        </Modal>
      )}
      {modal?.type === 'match' && (
        <Modal title="Las ideas conectaron." onClose={closeModal} className="match-modal">
          <div className="match-celebration">
            <span className="celebration-star">✦</span>
            <div className="match-avatars">
              <Photo profile={user} />
              <span>
                <Heart size={25} fill="currentColor" />
              </span>
              <Photo profile={modal.profile} />
            </div>
            <div className="eyebrow">Y AHORA, USTEDES.</div>
            <h2>
              ¡Es un <em>match!</em>
            </h2>
            <p>
              A ti y a {modal.profile.name} les gustó lo que vieron.
              <br />
              Una buena conversación puede ser el siguiente paso.
            </p>
            <Button onClick={() => openChat(modal)}>
              Romper el hielo <MessageCircle size={18} />
            </Button>
            <button className="text-link" onClick={closeModal}>
              Seguir descubriendo
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === 'safety' && (
        <Modal title={`Sobre ${modal.profile.name}`} onClose={closeModal}>
          <Safety
            profile={modal.profile}
            onDone={async () => {
              setModal(null);
              await Promise.all([fetchProfiles(), refreshMatches()]);
              setActiveMatch(null);
            }}
            notify={notify}
          />
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="Eliminar mi cuenta" onClose={closeModal}>
          <p className="modal-copy">
            Se eliminarán permanentemente tu perfil, sesiones, likes, matches, mensajes y denuncias
            asociadas. Esta acción no se puede deshacer.
          </p>
          <Button
            className="danger"
            onClick={async () => {
              try {
                await api('/me', { method: 'DELETE' });
                setToken('');
                setUser(null);
                setMatches([]);
                setProfiles([]);
                setModal(null);
                notify('Tu cuenta y sus datos fueron eliminados.');
              } catch (e) {
                notify(e.message, true);
              }
            }}
          >
            Eliminar mi cuenta y sus datos
          </Button>
        </Modal>
      )}
      {modal === 'plus' && (
        <Modal title="Más posibilidades. Tu misma esencia." onClose={closeModal}>
          <div className="plus-modal-icon">
            <Crown size={35} />
          </div>
          <span className="pill">RIGTHNDER PLUS · PRÓXIMAMENTE</span>
          <p className="modal-copy">
            Estamos diseñando una experiencia premium para quienes quieren dar el siguiente paso.
          </p>
          <ul className="feature-list">
            <li>
              <Heart size={19} /> Descubrir quién te dio like
            </li>
            <li>
              <SlidersHorizontal size={19} /> Preferencias más detalladas
            </li>
            <li>
              <Sparkles size={19} /> Más oportunidades de conectar
            </li>
            <li>
              <ShieldCheck size={19} /> Una experiencia sin anuncios
            </li>
          </ul>
          <p className="muted small-copy">
            Las suscripciones todavía no están disponibles. Puedes usar las funciones de esta
            versión gratuitamente.
          </p>
          <Button onClick={closeModal}>
            Seguir conectando <ArrowRight size={18} />
          </Button>
        </Modal>
      )}
      {modal === 'activity' && (
        <Modal title="Tu actividad" onClose={closeModal}>
          {matches.length ? (
            matches.map((match) => (
              <button className="activity-item" key={match.id} onClick={() => openChat(match)}>
                <Photo profile={match.profile} className="avatar" />
                <span>
                  <strong>Hiciste match con {match.profile.name}</strong>
                  <small>
                    {match.lastMessage?.text || 'La conversación puede empezar contigo.'}
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))
          ) : (
            <p className="modal-copy">
              Tus nuevos matches aparecerán aquí. Un like puede iniciar una buena historia.
            </p>
          )}
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title="Que conectar sea una buena experiencia" onClose={closeModal}>
          <Legal type="community" />
          <a
            className="button secondary"
            href="https://github.com/webr0m/rigthnder/issues"
            target="_blank"
            rel="noreferrer"
          >
            Reportar un problema técnico <ExternalLink size={16} />
          </a>
        </Modal>
      )}
      {(modal === 'privacy' || modal === 'terms') && (
        <Modal
          title={modal === 'privacy' ? 'Tus datos, tus decisiones' : 'Reglas para conectar bien'}
          onClose={closeModal}
        >
          <Legal type={modal} />
        </Modal>
      )}
    </div>
  );
}

function PageHeading({ eyebrow, title, text }) {
  return (
    <div className="page-intro alternative">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Empty({ icon: Icon, title, text, action, actionText }) {
  return (
    <div className="empty">
      <Icon size={40} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <Button onClick={action}>
          {actionText}
          <ArrowRight size={17} />
        </Button>
      )}
    </div>
  );
}
function FilterForm({ filters, onApply, busy }) {
  const [draft, setDraft] = useState(filters);
  const update = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
    >
      <p className="modal-copy">Busca conexiones por lo que de verdad te importa.</p>
      <label>
        Me interesa conocer
        <select value={draft.gender} onChange={(e) => update('gender', e.target.value)}>
          <option value="todos">Todas las personas</option>
          <option value="mujer">Mujeres</option>
          <option value="hombre">Hombres</option>
          <option value="otro">Otras identidades</option>
        </select>
      </label>
      <div className="form-row">
        <label>
          Edad mínima
          <input
            type="number"
            min="18"
            max="100"
            value={draft.minAge}
            onChange={(e) => update('minAge', e.target.value)}
            required
          />
        </label>
        <label>
          Edad máxima
          <input
            type="number"
            min={draft.minAge}
            max="100"
            value={draft.maxAge}
            onChange={(e) => update('maxAge', e.target.value)}
            required
          />
        </label>
      </div>
      <label>
        Ciudad
        <input
          value={draft.city}
          placeholder="Todas las ciudades"
          maxLength={60}
          onChange={(e) => update('city', e.target.value)}
        />
      </label>
      <label>
        Un valor que compartamos
        <select value={draft.value} onChange={(e) => update('value', e.target.value)}>
          <option value="">Todos los valores</option>
          {VALUE_LIST.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <button type="button" className="text-link" onClick={() => setDraft(DEFAULT_FILTERS)}>
          Restablecer
        </button>
        <Button disabled={busy}>
          Encontrar mi sintonía <ArrowRight size={17} />
        </Button>
      </div>
    </form>
  );
}
function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.38Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.42 13.89A6 6 0 0 1 6.1 12c0-.65.11-1.29.32-1.89v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.49l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.99c1.47 0 2.79.5 3.82 1.49l2.86-2.86A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.93 5.51l3.35 2.6C7.2 7.75 9.4 5.99 12 5.99Z"
      />
    </svg>
  );
}
function AuthForm({ mode, setMode, googlePending, googleEnabled, onSuccess, notify }) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const register = mode === 'register' || !!googlePending;
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.terms = data.terms === 'on';
    data.valuesConsent = data.valuesConsent === 'on';
    if (googlePending?.ticket) data.ticket = googlePending.ticket;
    try {
      onSuccess(
        await api(
          googlePending ? '/auth/google/complete' : register ? '/auth/register' : '/auth/login',
          { method: 'POST', body: data },
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      {googlePending ? (
        <div className="google-confirm">
          <GoogleIcon />
          <span>{googlePending.identity.email}</span>
          <Check size={17} />
        </div>
      ) : (
        <>
          <button
            type="button"
            className="google-button"
            disabled={loading}
            onClick={async () => {
              try {
                if (!googleEnabled) {
                  notify(
                    'El acceso con Google todavía no está disponible. Puedes ingresar con tu correo.',
                    true,
                  );
                  return;
                }
                await googleLogin();
              } catch (e) {
                notify(e.message, true);
              }
            }}
          >
            <GoogleIcon />
            Continuar con Google
          </button>
          <div className="form-divider">
            <span />o con tu correo
            <span />
          </div>
        </>
      )}
      {register && (
        <>
          <label>
            Tu nombre
            <input
              name="name"
              defaultValue={googlePending?.identity.name || ''}
              minLength={2}
              maxLength={40}
              autoComplete="given-name"
              required
              placeholder="¿Cómo te llamas?"
            />
          </label>
          <div className="form-row">
            <label>
              Fecha de nacimiento
              <input
                name="birthdate"
                type="date"
                min="1926-01-01"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                  .toISOString()
                  .slice(0, 10)}
                required
              />
            </label>
            <label>
              Me identifico como
              <select name="gender">
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="otro">Otra identidad</option>
              </select>
            </label>
          </div>
          <label>
            Tu ciudad
            <input
              name="city"
              defaultValue="Santiago"
              minLength={2}
              maxLength={60}
              required
              autoComplete="address-level2"
            />
          </label>
        </>
      )}
      {!googlePending && (
        <>
          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={160}
              placeholder="tu@correo.com"
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={register ? 10 : 1}
              maxLength={128}
              placeholder={register ? 'Al menos 10 caracteres' : 'Tu contraseña'}
            />
          </label>
        </>
      )}
      {register && (
        <>
          <label className="checkbox-label">
            <input type="checkbox" name="terms" required />
            <span>
              Tengo 18 años o más y acepto los{' '}
              <a href="/terminos" target="_blank" rel="noreferrer">
                términos y normas de comunidad
              </a>
              .
            </span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="valuesConsent" required />
            <span>
              Acepto mostrar voluntariamente mis valores en el perfil y usarlos para sugerir
              conexiones.{' '}
              <a href="/privacidad" target="_blank" rel="noreferrer">
                Ver privacidad
              </a>
              .
            </span>
          </label>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={loading}>
        {loading ? (
          <LoaderCircle className="spin" size={18} />
        ) : register ? (
          'Crear mi perfil'
        ) : (
          'Iniciar sesión'
        )}
        {!loading && <ArrowRight size={18} />}
      </Button>
      {!googlePending && (
        <p className="auth-switch">
          {register ? '¿Ya tienes cuenta?' : '¿Primera vez por aquí?'}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode(register ? 'login' : 'register');
            }}
          >
            {register ? 'Inicia sesión' : 'Crea tu perfil'}
          </button>
        </p>
      )}
    </form>
  );
}

function Chat({ user, matches, activeMatch, select, notify, refresh, safety, discover }) {
  const [messages, setMessages] = useState([]),
    [text, setText] = useState(''),
    [sending, setSending] = useState(false),
    [loading, setLoading] = useState(false);
  const end = useRef(null);
  const match = matches.find((m) => m.id === activeMatch);
  useEffect(() => {
    setMessages([]);
    if (!match) return;
    let alive = true;
    setLoading(true);
    const load = () =>
      api('/matches/' + match.id + '/messages')
        .then((result) => {
          if (alive) setMessages(result);
        })
        .catch((e) => {
          if (alive) notify(e.message, true);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    load();
    const timer = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [match?.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);
  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending || !match) return;
    setSending(true);
    try {
      await api('/matches/' + match.id + '/messages', { method: 'POST', body: { text } });
      setText('');
      setMessages(await api('/matches/' + match.id + '/messages'));
      await refresh();
    } catch (error) {
      notify(error.message, true);
    } finally {
      setSending(false);
    }
  }
  if (!matches.length)
    return (
      <Empty
        icon={MessageCircle}
        title="Una conversación necesita un match."
        text="Cuando ambos se gusten, podrán conversar aquí."
        action={discover}
        actionText="Descubrir personas"
      />
    );
  return (
    <div className={`chat-layout ${match ? 'has-active' : ''}`}>
      <div className="chat-list">
        <h3>
          Tus conversaciones <span>{matches.length}</span>
        </h3>
        {matches.map((m) => (
          <button
            className={`chat-person ${m.id === activeMatch ? 'active' : ''}`}
            key={m.id}
            onClick={() => select(m.id)}
          >
            <Photo profile={m.profile} className="avatar" />
            <span>
              <strong>
                {m.profile.name}
                <small>{m.profile.demo ? 'DEMO' : ''}</small>
              </strong>
              <p>{m.lastMessage?.text || 'Di hola. Lo demás se conversa.'}</p>
            </span>
          </button>
        ))}
      </div>
      <div className="chat-conversation">
        {match ? (
          <>
            <header className="chat-heading">
              <button
                className="icon-button chat-back"
                aria-label="Volver a conversaciones"
                onClick={() => select(null)}
              >
                <ChevronLeft size={22} />
              </button>
              <Photo profile={match.profile} className="avatar" />
              <div>
                <strong>{match.profile.name}</strong>
                <small>
                  {match.profile.city} · {user.demo ? 'Conversación simulada' : 'Tu conexión'}
                </small>
              </div>
              <button
                className="icon-button"
                aria-label="Opciones de seguridad"
                onClick={() => safety(match.profile)}
              >
                <MoreHorizontal size={22} />
              </button>
            </header>
            <div className="chat-messages">
              {loading && !messages.length ? (
                <LoaderCircle className="spin" />
              ) : (
                <>
                  <div className="chat-match-note">
                    <Heart size={19} />
                    <p>Hicieron match. Las buenas historias empiezan con un hola.</p>
                  </div>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.senderId === user.id ? 'own' : ''}`}
                    >
                      <p>{message.text}</p>
                      <small>
                        {new Date(message.createdAt).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </div>
                  ))}
                  <div ref={end} />
                </>
              )}
            </div>
            <div className="icebreakers">
              <button onClick={() => setText('¿Café y una buena conversación? ☕')}>
                <Coffee size={14} /> ¿Un café?
              </button>
              <button onClick={() => setText('¿Qué plan te hace feliz un domingo?')}>
                <Sparkles size={14} /> Romper el hielo
              </button>
            </div>
            <form className="message-form" onSubmit={send}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                aria-label="Escribe un mensaje"
                placeholder="Una buena conversación empieza aquí…"
              />
              <button aria-label="Enviar mensaje" disabled={!text.trim() || sending}>
                {sending ? <LoaderCircle className="spin" size={19} /> : <Send size={20} />}
              </button>
            </form>
          </>
        ) : (
          <Empty
            icon={MessageCircle}
            title="Elige una conversación"
            text="Tu próximo buen plan empieza con un mensaje."
          />
        )}
      </div>
    </div>
  );
}

function ProfileEditor({ user, setUser, notify, onLogout, onDelete, onPrivacy }) {
  const [draft, setDraft] = useState(user),
    [saving, setSaving] = useState(false),
    [photoChanged, setPhotoChanged] = useState(false),
    [adBusy, setAdBusy] = useState(false),
    [exportBusy, setExportBusy] = useState(false);
  const update = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
  function toggle(key, value, max) {
    const selected = draft[key];
    if (!selected.includes(value) && selected.length >= max) {
      notify(`Elige hasta ${max} opciones.`, true);
      return;
    }
    update(
      key,
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) {
      notify('Elige una foto JPG, PNG o WebP de menos de 10 MB.', true);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      update('photo', canvas.toDataURL('image/jpeg', 0.82));
      setPhotoChanged(true);
    } catch {
      notify('No pudimos leer esa imagen. Prueba otra foto.', true);
    }
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...draft };
      if (!photoChanged) delete body.photo;
      const result = await api('/me', { method: 'PUT', body });
      setUser(result);
      setDraft(result);
      setPhotoChanged(false);
      notify('Tu perfil ya tiene tu toque.');
    } catch (error) {
      notify(error.message, true);
    } finally {
      setSaving(false);
    }
  }
  async function exportData() {
    setExportBusy(true);
    try {
      const data = await api('/me/export');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rigthnder-mis-datos.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Descargamos tus datos.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setExportBusy(false);
    }
  }
  return (
    <div className="profile-layout">
      <form className="form edit-profile" onSubmit={save}>
        <div className="profile-editor-top">
          <Photo profile={draft} className="large-avatar" />
          <div>
            <h2>
              {draft.name}, {draft.age}
            </h2>
            <label className="upload-button">
              <Camera size={16} /> Añadir mi foto
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
            </label>
            <p>Usa una foto tuya. Evita información privada.</p>
          </div>
        </div>
        <div className="form-row">
          <label>
            Nombre
            <input
              value={draft.name}
              minLength={2}
              maxLength={40}
              required
              onChange={(e) => update('name', e.target.value)}
            />
          </label>
          <label>
            Ciudad
            <input
              value={draft.city}
              minLength={2}
              maxLength={60}
              required
              onChange={(e) => update('city', e.target.value)}
            />
          </label>
        </div>
        <label>
          Ocupación o una forma de describirte
          <input
            value={draft.occupation}
            maxLength={80}
            placeholder="Emprendedor & fan de los buenos planes"
            onChange={(e) => update('occupation', e.target.value)}
          />
        </label>
        <label>
          Un poco sobre mí
          <textarea
            value={draft.bio}
            maxLength={600}
            rows={3}
            placeholder="Tus ideas, tus planes y eso que te hace tú."
            onChange={(e) => update('bio', e.target.value)}
          />
          <small className="character-count">{draft.bio.length}/600</small>
        </label>
        <div>
          <h4>
            LO QUE ME MUEVE <span>Al menos un valor</span>
          </h4>
          <div className="select-chips">
            {VALUE_LIST.map((v) => (
              <button
                className={draft.values.includes(v) ? 'selected' : ''}
                type="button"
                key={v}
                onClick={() => toggle('values', v, 6)}
              >
                {draft.values.includes(v) && <Check size={14} />} {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4>
            FUERA DEL DEBATE <span>Hasta 6 intereses</span>
          </h4>
          <div className="select-chips">
            {INTEREST_LIST.map((v) => (
              <button
                className={draft.interests.includes(v) ? 'selected' : ''}
                type="button"
                key={v}
                onClick={() => toggle('interests', v, 6)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label>
            Busco
            <select value={draft.intention} onChange={(e) => update('intention', e.target.value)}>
              {['Una relación', 'Conocer personas', 'Ver qué pasa'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Me interesa conocer
            <select value={draft.lookingFor} onChange={(e) => update('lookingFor', e.target.value)}>
              <option value="todos">Todas las personas</option>
              <option value="mujer">Mujeres</option>
              <option value="hombre">Hombres</option>
              <option value="otro">Otras identidades</option>
            </select>
          </label>
        </div>
        <label>
          Me identifico como
          <select value={draft.gender} onChange={(e) => update('gender', e.target.value)}>
            <option value="mujer">Mujer</option>
            <option value="hombre">Hombre</option>
            <option value="otro">Otra identidad</option>
          </select>
        </label>
        <label>
          Una pregunta para romper el hielo
          <select value={draft.prompt} onChange={(e) => update('prompt', e.target.value)}>
            {[
              'Mi primera cita ideal sería…',
              'Una pequeña cosa que me hace feliz…',
              'Podría hablar durante horas de…',
              'Mi plan de fin de semana…',
              'Para conquistarme…',
              'Mi talento poco útil…',
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Tu respuesta
          <textarea
            value={draft.answer}
            maxLength={250}
            rows={2}
            onChange={(e) => update('answer', e.target.value)}
            placeholder="Empieza una buena conversación."
          />
        </label>
        <Button disabled={saving}>
          {saving ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              Guardar mi perfil <Check size={18} />
            </>
          )}
        </Button>
      </form>
      <aside className="account-panel">
        <ShieldCheck size={25} />
        <h3>
          Tus datos.
          <br />
          Tus decisiones.
        </h3>
        <p>
          Los valores que muestras son voluntarios. No los compartimos con plataformas
          publicitarias.
        </p>
        <button onClick={onPrivacy}>
          <LockKeyhole size={17} /> Ver privacidad <ArrowUpRight size={16} />
        </button>
        <button disabled={exportBusy} onClick={exportData}>
          <Download size={17} /> Descargar mis datos
        </button>
        <button
          disabled={adBusy}
          onClick={async () => {
            setAdBusy(true);
            try {
              notify(await startAds());
            } catch (e) {
              notify(e.message, true);
            } finally {
              setAdBusy(false);
            }
          }}
        >
          <Sparkles size={17} /> Probar anuncios en móvil
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
          <SlidersHorizontal size={17} /> Privacidad de anuncios
        </button>
        <div className="account-divider" />
        <button onClick={onLogout}>
          <LogOut size={17} /> Cerrar sesión
        </button>
        <button className="delete-account" onClick={onDelete}>
          Eliminar mi cuenta
        </button>
        {user.demo && (
          <p className="small-copy">
            Este perfil es de demostración. Crea una cuenta para conectar con personas reales.
          </p>
        )}
      </aside>
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
        Tu tranquilidad va primero. Bloquear un perfil cierra el match y evita que vuelvan a
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
          Rigthnder guarda tu nombre, correo, fecha de nacimiento, ciudad, foto, perfil, valores,
          intereses, reacciones y mensajes en el servidor de la aplicación.
        </p>
        <h3>Valores que eliges compartir</h3>
        <p>
          Los valores pueden revelar opiniones políticas. Tú decides cuáles publicar y aceptas su
          uso para sugerir conexiones. Puedes cambiarlos, descargar tus datos o eliminar tu cuenta
          en Mi perfil. Solo mostramos tu edad, no tu fecha de nacimiento ni tu correo.
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
        Rigthnder es una comunidad de citas para personas mayores de 18 años, inspirada en la
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
        El chat se habilita con un like mutuo. No compartas dinero, documentos ni tu dirección con
        personas desconocidas. Puedes denunciar o bloquear desde el perfil o la conversación.
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

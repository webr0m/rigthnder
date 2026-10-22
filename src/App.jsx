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
import { BetaAccount, BetaSettings, BetaService, BetaFilters, ProfileDetail } from './BetaPages';
import LanguagePicker, { useLanguage } from './LanguagePicker';
import { getLanguage, setLanguage, t, translateCommon } from './locale.mjs';
import PasswordRecovery from './PasswordRecovery';
export function Wordmark() {
  return (
    <span className="wordmark">
      {t('ONLY')}
      <span>{t('FACHOS')}</span>
    </span>
  );
}
const DEFAULT = {
  minAge: 18,
  maxAge: 60,
  gender: 'todos',
  city: '',
  current: '',
  faith: '',
  children: '',
  shared: 'false',
  verified: 'false',
};
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
export function ProfileCard({ profile: p, onWrite, onSafety, onOpen }) {
  const c = p.community || {},
    photos = c.photos?.length ? c.photos : p.photo ? [p.photo] : [];
  const facts = [
    ['DE DERECHA', t(c.years)],
    [
      'FE',
      c.faith === 'Sí'
        ? t(c.denomination) || t('Creyente')
        : c.faith === 'No'
          ? t('No creyente')
          : t(c.faith),
    ],
    ['HIJOS', c.children === 'Sí' ? t('Quiere') : t(c.children)],
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
    ['VIAJÓ', c.countryCount ? c.countryCount + ' ' + t('países') : ''],
    ['PARTIDO', c.party ? t(c.partyStance) + ' ' + c.party : t(c.partyStance)],
  ];
  return (
    <article className="profile-card" id={'person-' + p.id} aria-labelledby={'name-' + p.id}>
      <header className="profile-card-heading">
        <span className={'profile-avatar' + (p.online ? ' is-online' : '')}>
          <Photo profile={p} className="avatar" />
          {p.online && <i aria-label={p.demo ? t('En línea en la demo') : t('En línea')} />}
        </span>
        <div className="profile-name">
          <h2 id={'name-' + p.id}>
            <button className="profile-open" onClick={() => onOpen?.(p)}>
              {p.name}, {p.age}
              {p.demo && <small>{t('DEMO')}</small>}
            </button>
          </h2>
          <span className="current-tag">{t(c.current) || t('Ideas propias')}</span>
          <p>
            {p.occupation || t('Con ganas de conversar')} · {locationLabel(p)}
          </p>
        </div>
        <Button
          className="write-button"
          aria-label={t('Escribir a ') + p.name}
          onClick={() => onWrite(p)}
        >
          <MessageCircle size={14} />
          {t(' Escribir')}
        </Button>
        <button
          className="icon-button card-options"
          aria-label={t('Opciones de ') + p.name}
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
                    ? t('Plan ilustrativo de ') + p.name
                    : t('Foto ') + (i + 1) + t(' de ') + p.name
                }
              />
            ))
        ) : (
          <Photo profile={p} />
        )}
      </div>
      <div className="profile-card-body">
        <p className="profile-bio">
          {p.bio || t('Todavía está preparando su presentación. Rompe el hielo con un hola.')}
        </p>
        {!!p.common?.length && (
          <div className="common-row">
            <strong>
              {p.common.length}
              {t('EN COMÚN')}
            </strong>
            <div>
              {p.common.slice(0, 4).map((v) => (
                <span key={v}>{translateCommon(v)}</span>
              ))}
            </div>
          </div>
        )}
        <dl className="profile-facts">
          {facts.map(([label, value]) => (
            <div key={t(label)}>
              <dt>{t(label)}</dt>
              <dd>{value || t('Sin compartir')}</dd>
            </div>
          ))}
        </dl>
        <div className="consumption">
          {[
            ['VE', c.streamers],
            ['LEE', c.authors],
            ['SIGUE', c.creators],
            ['ESCUCHA', c.artists],
          ]
            .filter(([, v]) => v?.length)
            .map(([label, items]) => (
              <div key={t(label)}>
                <strong>{t(label)}</strong>
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
function Access({ options, notify, onLogin, onRegister, onLegal, onRecover, initialLogin }) {
  const [login, setLogin] = useState(Boolean(initialLogin)),
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
            <i />
            {t(' +18 · SIN SWIPES · SOLO CONVERSACIÓN')}
          </p>
          <h1>
            {t('CONOCE GENTE')}
            <br />
            <mark>{t('BASADA')}</mark>
            <span className="red-asterisk">✳</span>
          </h1>
          <p>
            {t(
              'Scrollea perfiles, mira a quién ve, qué lee y qué piensa. Si te convence, escríbele.',
            )}
          </p>
          <div className="access-steps">
            <span>
              01 <b>{t('SCROLLEA')}</b>
            </span>
            <span>
              02 <b>{t('CONVERSA')}</b>
            </span>
            <span>
              03 <b>{t('QUEDA')}</b>
            </span>
          </div>
        </div>
        <span className="access-note">{t('Las buenas ideas merecen una buena compañía.')}</span>
      </section>
      <section className="access-form">
        <span className="label-strip">
          {login ? t('TU COMUNIDAD TE ESPERA') : t('AQUÍ EMPIEZA LA CONVERSACIÓN')}
        </span>
        <h2>{login ? t('VOLVISTE, BASADO.') : t('SIN RODEOS.')}</h2>
        <form className="form" onSubmit={submit}>
          <button
            type="button"
            className="social-login"
            onClick={() => notify('Apple aún no está habilitado. Puedes continuar con tu correo.')}
          >
            ● <span>{t('Continuar con Apple')}</span>
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
            <b>{t('G')}</b>
            <span>{t('Continuar con Google')}</span>
          </button>
          <div className="form-divider">
            <span />
            {t('O CON CORREO')}
            <span />
          </div>
          <label>
            {t('Correo')}
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder={t('tu@correo.com')}
              autoComplete="email"
            />
          </label>
          <label>
            {t('Contraseña')}
            <input
              name="password"
              type="password"
              required
              minLength={login ? 1 : 10}
              maxLength={128}
              placeholder={login ? t('Tu contraseña') : t('Mínimo 10 caracteres')}
              autoComplete={login ? 'current-password' : 'new-password'}
            />
          </label>
          {login && (
            <button type="button" className="text-link" onClick={onRecover}>
              {t('Olvidé mi contraseña')}
            </button>
          )}
          {error && (
            <p className="form-error" role="alert">
              {t(error)}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" />
            ) : login ? (
              t('INICIAR SESIÓN')
            ) : (
              t('CREAR CUENTA')
            )}
          </Button>
          <p className="auth-switch">
            {login ? t('¿Primera vez por aquí?') : t('¿Ya tienes cuenta?')}{' '}
            <button
              type="button"
              onClick={() => {
                setLogin(!login);
                setError('');
              }}
            >
              {login ? t('Crea tu cuenta') : t('Inicia sesión')}
            </button>
          </p>
          <p className="hint">
            {t('Solo mayores de 18 años. Revisa los')}{' '}
            <button type="button" className="inline-link" onClick={() => onLegal('terms')}>
              {t('Términos')}
            </button>{' '}
            {t('y la')}{' '}
            <button type="button" className="inline-link" onClick={() => onLegal('privacy')}>
              {t('Política de privacidad')}
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
            {t('Explorar la demostración ')}
            <ArrowRight size={16} />
          </button>
        )}
      </section>
    </div>
  );
}
export default function App() {
  const [recovery, setRecovery] = useState(() =>
    location.pathname === '/recuperar-contrasena'
      ? { token: new URLSearchParams(location.hash.slice(1)).get('token') ?? undefined }
      : null,
  );
  const [loginRequested, setLoginRequested] = useState(false);
  useEffect(() => {
    const syncRecovery = () => {
      if (location.pathname === '/recuperar-contrasena') {
        const fragment = new URLSearchParams(location.hash.slice(1));
        setRecovery({ token: fragment.get('token') ?? undefined });
        const lang = fragment.get('lang');
        if (['es', 'en', 'de'].includes(lang)) setLanguage(lang);
      } else {
        setRecovery(null);
      }
    };
    syncRecovery();
    window.addEventListener('hashchange', syncRecovery);
    window.addEventListener('popstate', syncRecovery);
    return () => {
      window.removeEventListener('hashchange', syncRecovery);
      window.removeEventListener('popstate', syncRecovery);
    };
  }, []);
  const language = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('OnlyFachos — Sin swipes. Solo conversación');
  }, [language]);
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
  const [profileView, setProfileView] = useState(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [service, setService] = useState(null);
  async function saveSettings(patch) {
    try {
      const result = await api('/me/settings', { method: 'PUT', body: patch });
      setUser(result);
      setReload((v) => v + 1);
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function openProfile(p) {
    try {
      const result = await api('/people/' + p.id);
      setProfileView(result);
      if (p.id !== user.id) await api('/people/' + p.id + '/visit', { method: 'POST' });
    } catch (e) {
      notify(e.message, true);
    }
  }
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('onlyfachos-theme') || 'auto';
    } catch {
      return 'auto';
    }
  });
  function toggleTheme() {
    const appearance = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(appearance);
    if (user) saveSettings({ appearance });
  }
  const sentinel = useRef(null),
    version = useRef(0),
    toastTimer = useRef(),
    scroll = useRef(0),
    chatOrigin = useRef('chat');
  function notify(message, error = false) {
    clearTimeout(toastTimer.current);
    setToast({ message: t(message), error });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }
  function signedIn(r) {
    setToken(r.token);
    setUser(r.user);
    if (r.user.settings?.appearance) setTheme(r.user.settings.appearance);
    if (r.user.settings?.language) setLanguage(r.user.settings.language);
    setTab('community');
    setWizard(null);
    setFilters({ ...DEFAULT, gender: r.user.lookingFor });
    setActive(null);
    setReload((v) => v + 1);
  }
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const value = theme === 'auto' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = value;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', value === 'dark' ? '#0d0d11' : '#f2efe6');
    };
    apply();
    media.addEventListener('change', apply);
    try {
      localStorage.setItem('onlyfachos-theme', theme);
    } catch {}
    return () => media.removeEventListener('change', apply);
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
        } else if (location.pathname !== '/recuperar-contrasena') {
          try {
            const me = await api('/me');
            if (alive) {
              setUser(me);
              if (me.settings?.appearance) setTheme(me.settings.appearance);
              if (me.settings?.language) setLanguage(me.settings.language);
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
              appearance: theme,
              language: getLanguage(),
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
  if (ready && !initError && recovery)
    return (
      <div className="recovery-shell">
        <header className="recovery-header">
          <Wordmark />
          <LanguagePicker />
          <button className="icon-button" aria-label={t('Cambiar tema')} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </header>
        <PasswordRecovery
          key={recovery.token ?? 'request'}
          token={recovery.token}
          onReset={() => setUser(null)}
          onBack={() => {
            history.replaceState({}, '', '/');
            setRecovery(null);
            setLoginRequested(true);
          }}
        />
      </div>
    );
  if (!ready || initError)
    return (
      <div className="boot">
        <Wordmark />
        {initError ? (
          <>
            <p>{initError}</p>
            <Button onClick={() => location.reload()}>{t('Volver a intentar')}</Button>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>{t('Preparando buenas conversaciones…')}</p>
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
          <div className="access-language">
            <LanguagePicker />
          </div>
          <button
            className="theme-access icon-button"
            aria-label={t('Cambiar tema')}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          <Access
            options={options}
            notify={notify}
            onLogin={signedIn}
            onRegister={(credentials) => setWizard({ type: 'create', credentials })}
            onLegal={setModal}
            initialLogin={loginRequested}
            onRecover={() => {
              history.pushState({}, '', '/recuperar-contrasena');
              setRecovery({});
            }}
          />
        </>
      ) : wizard ? (
        <div className="onboarding-shell">
          <div className="onboarding-brand">
            <Wordmark />
            <LanguagePicker />
          </div>
          <Onboarding
            key={wizard.type}
            user={wizard.type === 'edit' ? user : null}
            identity={wizard.identity}
            initialStep={wizard.step || 1}
            onSave={saveWizard}
            onCancel={() => setWizard(null)}
            busy={busy}
          />
          <aside className="onboarding-aside">
            <span className="eyebrow">{t('TU PERFIL. TUS REGLAS.')}</span>
            <h2>
              {t('QUE TE CONOZCAN')}
              <br />
              {t('POR LO QUE')}
              <br />
              <mark>{t('PIENSAS.')}</mark>
            </h2>
            <p>
              {t('No solo por una foto. Comparte tus referentes, tus planes y lo que te hace tú.')}
            </p>
            <ShieldCheck />
            <p className="hint">
              {t('Tú eliges qué publicar. Política y religión son opcionales.')}
            </p>
          </aside>
        </div>
      ) : (
        <>
          <aside className="desktop-nav">
            <button onClick={() => navigate('community')} aria-label={t('OnlyFachos inicio')}>
              <Wordmark />
            </button>
            <p className="sidebar-tagline">
              {t('SIN SWIPES.')}
              <br />
              {t('CON ALGO QUE DECIR.')}
            </p>
            <nav aria-label={t('Navegación principal')}>
              {NAV.map(([id, Icon, label]) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => navigate(id)}
                >
                  <Icon size={20} />
                  {t(label)}
                  {id === 'chat' && conversations.some((c) => c.unread) && (
                    <small>{conversations.reduce((n, c) => n + c.unread, 0)}</small>
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-manifesto">
              <span>{t('01 / CONEXIONES CON IDEAS')}</span>
              <p>
                {t('MENOS DESLIZAR.')}
                <br />
                <mark>{t('MÁS HABLAR.')}</mark>
              </p>
            </div>
            <button className="sidebar-account" onClick={() => navigate('profile')}>
              <Photo profile={user} className="avatar" />
              <span>
                {user.name}
                <small>{user.demo ? t('Perfil demo · Beta 1') : t('Mi cuenta · Beta 1')}</small>
              </span>
            </button>
          </aside>
          <div className="app-workspace">
            <header className="community-header">
              <button
                className="brand-button"
                aria-label={t('Ir a la comunidad')}
                onClick={() => navigate('community')}
              >
                <Wordmark />
              </button>
              <div className="header-search">
                <Search size={16} />
                <input
                  aria-label={t('Buscar personas o ciudad')}
                  placeholder={t('Busca una persona o ciudad…')}
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
                  aria-label={t('Cambiar tema')}
                  title={theme === 'dark' ? t('Modo claro') : t('Modo oscuro')}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  className="icon-button activity-button"
                  aria-label={t('Ver invitaciones y actividad')}
                  onClick={() => setModal('activity')}
                >
                  <Bell size={20} />
                  {conversations.some((c) => c.invitations.length) && <i />}
                </button>
              </div>
            </header>
            {user.demo && (
              <div className="demo-banner">
                <span>
                  {t('DEMO · Perfiles ficticios, fotos ilustrativas y respuestas simuladas.')}
                </span>
                <button onClick={() => setModal('create')}>
                  {t('Crear mi cuenta ')}
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
            <main className={'page page-' + tab}>
              <div hidden={tab !== 'community'} className="community-layout">
                <div className="feed-column">
                  <div className="mobile-search">
                    <Search size={17} />
                    <input
                      aria-label={t('Buscar en la comunidad')}
                      placeholder={t('Busca por streamer, autor, ciudad…')}
                      maxLength={60}
                      value={search}
                      onChange={(e) => {
                        setFindPerson(null);
                        setSearch(e.target.value);
                      }}
                    />
                  </div>
                  <div className="feed-toolbar">
                    <div className="feed-tabs" role="tablist" aria-label={t('Filtrar comunidad')}>
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
                          {t(label)}
                          {id === 'online' && <i />}
                        </button>
                      ))}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={t('Filtrar perfiles')}
                      onClick={() => setModal('filters')}
                    >
                      <SlidersHorizontal size={18} />
                    </button>
                  </div>
                  <section className="online-section" aria-label={t('Personas en línea')}>
                    <div className="online-title">
                      <i />
                      {t(' EN LÍNEA ')}
                      {user.demo ? t('EN LA DEMO') : t('AHORA')} <b>· {feed.online.length}</b>
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
                        <p className="hint">{t('Aparecerán aquí cuando estén activas.')}</p>
                      )}
                    </div>
                  </section>
                  {user.demo && (
                    <p className="mobile-demo-note">
                      {t('DEMO · Perfiles ficticios y respuestas simuladas.')}
                    </p>
                  )}
                  <div className="feed-caption">
                    <span>
                      {mode === 'near'
                        ? t('MISMA CIUDAD · ') + user.city
                        : mode === 'shared'
                          ? t('REFERENTES EN COMÚN')
                          : t('PERFILES CON ALGO QUE DECIR')}
                    </span>
                    <small>
                      {feed.total || 0}
                      {t(' perfiles')}
                    </small>
                  </div>
                  {feedError ? (
                    <div className="empty-state">
                      <h2>{t('No pudimos cargar el feed.')}</h2>
                      <p>{feedError}</p>
                      <Button onClick={() => setReload((v) => v + 1)}>
                        {t('VOLVER A INTENTAR')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <section
                        className="profile-feed"
                        aria-label={t('Perfiles de la comunidad')}
                        aria-busy={feedBusy}
                      >
                        {feed.profiles.map((p) => (
                          <ProfileCard
                            profile={p}
                            onWrite={write}
                            onOpen={openProfile}
                            onSafety={safety}
                            key={p.id}
                          />
                        ))}
                      </section>
                      {feedBusy && (
                        <div className="loading">
                          <LoaderCircle className="spin" />
                          {t(' Cargando perfiles…')}
                        </div>
                      )}
                      {!feedBusy && !feed.profiles.length && (
                        <div className="empty-state">
                          <Search size={28} />
                          <h2>{t('SE ACABARON LOS FACHOS POR HOY.')}</h2>
                          <p>
                            {t(
                              'Prueba otra ciudad, amplía tus filtros o sigue una buena conversación.',
                            )}
                          </p>
                          <button className="text-link" onClick={() => setModal('filters')}>
                            {t('Ajustar mis filtros')}
                          </button>
                          {conversations.length > 0 && (
                            <button className="text-link" onClick={() => navigate('chat')}>
                              {t('Volver a mis chats')}
                            </button>
                          )}
                          <Button
                            onClick={() => {
                              setSearch('');
                              setMode('all');
                              setFilters({ ...DEFAULT });
                            }}
                          >
                            {t('VER TODA LA COMUNIDAD')}
                          </Button>
                        </div>
                      )}
                      <div ref={sentinel} />
                      {pageError && (
                        <p className="form-error" role="alert">
                          {pageError}
                          {t('. Puedes reintentar sin perder los perfiles que ya cargaron.')}
                        </p>
                      )}
                      {feed.hasMore && (
                        <button className="load-more" disabled={feedBusy} onClick={more}>
                          {t('Cargar más perfiles')}
                        </button>
                      )}
                      {!feedBusy && !feed.hasMore && feed.profiles.length > 0 && (
                        <div className="feed-end">
                          <span>✳</span>
                          <strong>{t('ESTÁS AL DÍA.')}</strong>
                          <p>{t('Una buena conversación puede empezar más arriba.')}</p>
                          <button
                            className="text-link"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          >
                            {t('Volver al inicio ↑')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <aside className="feed-aside">
                  <span className="label-strip">{t('ASÍ FUNCIONA')}</span>
                  <h1>
                    {t('PRIMERO EL HOLA.')}
                    <br />
                    <mark>{t('DESPUÉS LA CITA.')}</mark>
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
                      <li key={t(title)}>
                        <b>0{i + 1}</b>
                        <div>
                          <strong>{t(title)}</strong>
                          <p>{text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="aside-safety">
                    <ShieldCheck size={20} />
                    <p>
                      {t('Tu espacio, tus límites.')}
                      <br />
                      {t('Puedes bloquear y denunciar.')}
                    </p>
                  </div>
                  <div className="community-footnotes">
                    <button onClick={() => setModal('privacy')}>{t('Privacidad')}</button>
                    <button onClick={() => setModal('terms')}>{t('Términos')}</button>
                    <small>
                      {t('ONLYFACHOS © ')}
                      {new Date().getFullYear()}
                    </small>
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
              {tab === 'profile' &&
                (settingsOpen ? (
                  <BetaSettings
                    user={user}
                    theme={theme}
                    setTheme={setTheme}
                    saveSettings={saveSettings}
                    onBack={() => setSettingsOpen(false)}
                    onLegal={setModal}
                    onDelete={() => setModal('delete')}
                    logout={logout}
                    exportData={exportData}
                    notify={notify}
                    onService={setService}
                    onAds={async () => {
                      try {
                        notify(await startAds());
                      } catch (e) {
                        notify(e.message, true);
                      }
                    }}
                    onAdPrivacy={async () => {
                      try {
                        await privacyAds();
                      } catch (e) {
                        notify(e.message, true);
                      }
                    }}
                  />
                ) : (
                  <BetaAccount
                    user={user}
                    onEdit={(step) => setWizard({ type: 'edit', step })}
                    onPreview={() => openProfile(user)}
                    onSettings={() => setSettingsOpen(true)}
                    saveSettings={saveSettings}
                    onPro={() => setService('pro')}
                    notify={notify}
                  />
                ))}
            </main>
          </div>
          <nav className="bottom-nav" aria-label={t('Navegación móvil')}>
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
                  {id === 'chat' && conversations.some((c) => c.unread) && (
                    <small>{conversations.reduce((n, c) => n + c.unread, 0)}</small>
                  )}
                </span>
                {t(label)}
              </button>
            ))}
          </nav>
        </>
      )}
      {service && <BetaService kind={service} onClose={() => setService(null)} notify={notify} />}
      {profileView && (
        <ProfileDetail
          profile={profileView}
          me={user}
          onWrite={(p) => {
            setProfileView(null);
            if (p.id !== user.id) write(p);
          }}
          safety={(p) => {
            setProfileView(null);
            safety(p);
          }}
          onClose={() => setProfileView(null)}
        />
      )}
      {modal === 'filters' && (
        <Modal title={t('TU COMUNIDAD, A TU MANERA')} onClose={() => setModal(null)}>
          <BetaFilters
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
          title={modal === 'privacy' ? t('TU PRIVACIDAD') : t('NORMAS DE COMUNIDAD')}
          onClose={() => setModal(null)}
        >
          <Legal type={modal} />
        </Modal>
      )}
      {modal?.type === 'safety' && (
        <Modal title={t('TÚ PONES LOS LÍMITES')} onClose={() => setModal(null)}>
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
        <Modal title={t('TU PRÓXIMA CONVERSACIÓN')} onClose={() => setModal(null)}>
          <p>
            {t(
              'Estás explorando la demo. Para conectar con personas reales, cierra esta sesión y crea tu propia cuenta.',
            )}
          </p>
          <Button
            onClick={async () => {
              await logout();
              setModal(null);
            }}
          >
            {t('CREAR MI CUENTA')}
          </Button>
        </Modal>
      )}
      {modal === 'activity' && (
        <Modal title={t('LO QUE ESTÁ PASANDO')} onClose={() => setModal(null)}>
          <div className="activity-list">
            {conversations
              .filter((c) => c.invitations.length || c.proposals?.length)
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
                      {(c.proposals?.[0] || c.invitations[0]).status === 'accepted'
                        ? t('¡Tienen una cita!')
                        : (c.proposals?.[0] || c.invitations[0]).status === 'pending'
                          ? t('Invitación pendiente')
                          : t('Pueden seguir conversando')}
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
            {!conversations.some((c) => c.invitations.length || c.proposals?.length) && (
              <div className="empty-state">
                <Coffee size={30} />
                <h3>{t('TODAVÍA NO HAY INVITACIONES.')}</h3>
                <p>{t('Cuando una conversación se convierta en un plan, lo verás aquí.')}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title={t('ELIMINAR MI CUENTA')} onClose={() => setModal(null)}>
          <p>
            {t(
              'Se eliminarán tu perfil, fotos, conversaciones e invitaciones de la base activa. Esta acción no se puede deshacer.',
            )}
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
            {t('SÍ, ELIMINAR MI CUENTA')}
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
          <button aria-label={t('Cerrar aviso')} onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

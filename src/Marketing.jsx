import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Apple,
  Play,
  Pause,
  MessageCircle,
  Heart,
  ShieldCheck,
  MoveUpRight,
} from 'lucide-react';
import { Legal, Modal } from './Shared';
import LanguagePicker, { useLanguage } from './LanguagePicker';
import './marketing.css';

const copy = {
  es: {
    nav: ['La conexión', 'Cómo funciona', 'La demo'],
    demo: 'Explorar la demo',
    login: 'Ya tengo cuenta',
    eyebrow: 'IDEAS CLARAS. CORAZÓN ABIERTO.',
    title: ['QUE HAYA', 'QUÍMICA.', 'Y ALGO MÁS.'],
    intro: 'La app de citas para quienes miran a la derecha y quieren encontrarse de verdad.',
    stamp: ['UN CAFÉ.', 'MIL POSIBILIDADES.'],
    soon: 'Próximamente en',
    scroll: 'Hay mucho por descubrir',
    pause: 'Pausar movimiento',
    resume: 'Activar movimiento',
    band: ['MENOS SWIPE', 'MÁS CONVERSACIÓN', 'MÁS TÚ'],
    reason: 'ALGO EN COMÚN ES UN BUEN COMIENZO.',
    reasonText:
      'La atracción abre la puerta. Una buena conversación te invita a quedarte. Conoce personas por sus ideas, sus gustos y esa forma de ver la vida que también te mueve a ti.',
    tags: ['Tus valores', 'Tu música', 'Tu fe, si quieres', 'Tus ganas de conocer'],
    how: 'DEL SCROLL A ESE PRIMER CAFÉ.',
    howIntro: 'Sin esperar un match para dar el primer paso.',
    steps: [
      [
        'Scrollea con intención.',
        'Explora perfiles en un feed continuo. Descubre qué escuchan, qué leen y qué les apasiona.',
      ],
      [
        'Rompe el hielo.',
        'Escribe directamente. Una idea en común puede ser el comienzo de una gran conversación.',
      ],
      [
        'Que el plan sea de a dos.',
        'Cualquiera puede proponer una cita. La otra persona decide si acepta. Así de recíproco.',
      ],
    ],
    preview: 'ASÍ SE SIENTE ONLYFACHOS',
    previewTitle: 'TU PRÓXIMA BUENA CONVERSACIÓN.',
    previewText:
      'Entra, recorre el feed y prueba los chats y las invitaciones. Sin crear una cuenta.',
    fictional: 'Demo con perfiles y conversaciones ficticios. No contactas a personas reales.',
    write: 'Escribir',
    person: 'Lucía, 27',
    place: 'Santiago · Ideas propias',
    bio: 'Un buen café, una playlist compartida y una conversación que se alargue.',
    shared: 'EN COMÚN',
    chat: '¿Café y una buena conversación?',
    reply: 'Me gusta ese plan ☕',
    invite: 'Una invitación para conocerse',
    safety: 'LA CHISPA ES TUYA. LOS LÍMITES, TAMBIÉN.',
    safetyText:
      'Solo para mayores de 18 años. Tú eliges qué compartes. Puedes bloquear y denunciar desde el perfil o el chat. Tus datos de política y religión son opcionales y no se envían a anunciantes.',
    final: 'LO MEJOR EMPIEZA CON UN HOLA.',
    finalText:
      'Estamos preparando nuestra llegada a App Store y Google Play. Mientras tanto, descubre la experiencia en la demo.',
    legal: ['Privacidad', 'Comunidad', 'Seguridad infantil', 'Eliminar cuenta'],
    contact: 'Contacto',
    image: 'Imagen de campaña creada con IA. Personas ficticias.',
    age: 'Una comunidad para mayores de 18 años.',
  },
  en: {
    nav: ['The connection', 'How it works', 'The demo'],
    demo: 'Explore the demo',
    login: 'I have an account',
    eyebrow: 'CLEAR VALUES. OPEN HEARTS.',
    title: ['LET THERE BE', 'CHEMISTRY.', 'AND MORE.'],
    intro: 'The dating app for right-minded people looking for a real connection.',
    stamp: ['ONE COFFEE.', 'ENDLESS POSSIBILITIES.'],
    soon: 'Coming soon to',
    scroll: 'There is more to discover',
    pause: 'Pause motion',
    resume: 'Enable motion',
    band: ['LESS SWIPING', 'MORE CONVERSATION', 'MORE YOU'],
    reason: 'SOMETHING IN COMMON IS A GOOD START.',
    reasonText:
      'Attraction opens the door. A great conversation makes you want to stay. Meet people through their ideas, their interests and the way they see the world.',
    tags: ['Your values', 'Your music', 'Your faith, if you wish', 'Your curiosity'],
    how: 'FROM A SCROLL TO THAT FIRST COFFEE.',
    howIntro: 'No need to wait for a match to make the first move.',
    steps: [
      [
        'Scroll with intention.',
        'Explore profiles in a continuous feed. Discover what they listen to, read and love.',
      ],
      ['Break the ice.', 'Send a message directly. A shared idea can start a great conversation.'],
      [
        'Make a plan together.',
        'Either person can suggest a date. The other chooses whether to accept. It goes both ways.',
      ],
    ],
    preview: 'THIS IS ONLYFACHOS',
    previewTitle: 'YOUR NEXT GREAT CONVERSATION.',
    previewText: 'Browse the feed and try chats and invitations. No account needed.',
    fictional:
      'The demo uses fictional profiles and conversations. You are not contacting real people.',
    write: 'Message',
    person: 'Lucía, 27',
    place: 'Santiago · Independent thinker',
    bio: 'Good coffee, a shared playlist and a conversation that lasts.',
    shared: 'IN COMMON',
    chat: 'Coffee and a good conversation?',
    reply: 'Sounds like a plan ☕',
    invite: 'An invitation to meet',
    safety: 'YOUR SPARK. YOUR BOUNDARIES.',
    safetyText:
      'For adults aged 18 and over. You choose what to share. Block and report from a profile or chat. Political and religious information is optional and is not sent to advertisers.',
    final: 'THE BEST THINGS START WITH HELLO.',
    finalText:
      'We are getting ready for App Store and Google Play. In the meantime, discover the experience in our demo.',
    legal: ['Privacy', 'Community', 'Child safety', 'Delete account'],
    contact: 'Contact',
    image: 'AI-generated campaign image. Fictional people.',
    age: 'A community for adults aged 18 and over.',
  },
  de: {
    nav: ['Die Verbindung', 'So funktioniert’s', 'Die Demo'],
    demo: 'Demo entdecken',
    login: 'Ich habe ein Konto',
    eyebrow: 'KLARE WERTE. OFFENE HERZEN.',
    title: ['ZEIT FÜR', 'CHEMIE.', 'UND MEHR.'],
    intro: 'Die Dating-App für Menschen mit rechten Werten, die eine echte Verbindung suchen.',
    stamp: ['EIN KAFFEE.', 'VIELE MÖGLICHKEITEN.'],
    soon: 'Demnächst im',
    scroll: 'Es gibt mehr zu entdecken',
    pause: 'Bewegung pausieren',
    resume: 'Bewegung aktivieren',
    band: ['WENIGER SWIPEN', 'MEHR GESPRÄCHE', 'MEHR DU'],
    reason: 'GEMEINSAMKEITEN SIND EIN GUTER ANFANG.',
    reasonText:
      'Anziehung öffnet die Tür. Ein gutes Gespräch lädt zum Bleiben ein. Lerne Menschen durch ihre Ideen, Interessen und ihren Blick auf das Leben kennen.',
    tags: ['Deine Werte', 'Deine Musik', 'Dein Glaube, wenn du willst', 'Deine Neugier'],
    how: 'VOM SCROLLEN ZUM ERSTEN KAFFEE.',
    howIntro: 'Du musst nicht auf ein Match warten, um den ersten Schritt zu machen.',
    steps: [
      [
        'Bewusst scrollen.',
        'Entdecke Profile in einem durchgehenden Feed. Erfahre, was andere hören, lesen und begeistert.',
      ],
      [
        'Das Eis brechen.',
        'Schreibe direkt. Eine gemeinsame Idee kann ein tolles Gespräch beginnen.',
      ],
      [
        'Gemeinsam etwas planen.',
        'Beide können ein Date vorschlagen. Die andere Person entscheidet, ob sie annimmt. Ganz auf Gegenseitigkeit.',
      ],
    ],
    preview: 'SO FÜHLT SICH ONLYFACHOS AN',
    previewTitle: 'DEIN NÄCHSTES GUTES GESPRÄCH.',
    previewText: 'Entdecke den Feed und probiere Chats und Einladungen aus. Ohne Registrierung.',
    fictional:
      'Die Demo enthält fiktive Profile und Gespräche. Du kontaktierst keine echten Menschen.',
    write: 'Schreiben',
    person: 'Lucía, 27',
    place: 'Santiago · Eigene Ideen',
    bio: 'Guter Kaffee, eine gemeinsame Playlist und ein Gespräch, das länger dauert.',
    shared: 'GEMEINSAM',
    chat: 'Kaffee und ein gutes Gespräch?',
    reply: 'Das klingt gut ☕',
    invite: 'Eine Einladung zum Kennenlernen',
    safety: 'DEIN FUNKE. DEINE GRENZEN.',
    safetyText:
      'Nur für Erwachsene ab 18 Jahren. Du entscheidest, was du teilst. Profile lassen sich im Profil oder Chat blockieren und melden. Angaben zu Politik und Religion sind freiwillig und werden nicht an Werbetreibende gesendet.',
    final: 'DAS BESTE BEGINNT MIT EINEM HALLO.',
    finalText:
      'Wir bereiten unseren Start im App Store und bei Google Play vor. Bis dahin kannst du die Demo entdecken.',
    legal: ['Datenschutz', 'Community', 'Kinderschutz', 'Konto löschen'],
    contact: 'Kontakt',
    image: 'KI-generiertes Kampagnenbild. Fiktive Personen.',
    age: 'Eine Community für Erwachsene ab 18 Jahren.',
  },
};
const legalRoutes = {
  '/privacidad': 'privacy',
  '/terminos': 'terms',
  '/seguridad-infantil': 'child-safety',
  '/eliminar-cuenta': 'account-deletion',
};
function Brand() {
  return (
    <span className="m-brand">
      ONLY<span>FACHOS</span>
    </span>
  );
}
function StoreSoon({ c }) {
  return (
    <div className="m-stores" aria-label={c.soon}>
      <span>
        <Apple size={23} aria-hidden="true" />
        <span>
          <small>{c.soon}</small>
          <b>App Store</b>
        </span>
      </span>
      <span>
        <Play size={22} aria-hidden="true" />
        <span>
          <small>{c.soon}</small>
          <b>Google Play</b>
        </span>
      </span>
    </div>
  );
}
export default function Marketing() {
  const lang = useLanguage(),
    c = copy[lang] || copy.es;
  const [paused, setPaused] = useState(false),
    [legal, setLegal] = useState(legalRoutes[location.pathname] || null);
  const root = useRef(null);
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.lang = lang;
    document.title = 'OnlyFachos — ' + c.eyebrow;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('m-visible');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.current.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    const sync = () => setLegal(legalRoutes[location.pathname] || null);
    window.addEventListener('popstate', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', sync);
    };
  }, [lang]);
  function openLegal(event, path) {
    event.preventDefault();
    history.pushState({}, '', path);
    setLegal(legalRoutes[path]);
  }
  function closeLegal() {
    history.pushState({}, '', '/');
    setLegal(null);
  }
  return (
    <div ref={root} className={'marketing' + (paused ? ' m-paused' : '')}>
      <a className="m-skip" href="#conexion">
        {c.nav[0]}
      </a>
      <header className="m-header">
        <a href="/" aria-label="OnlyFachos">
          <Brand />
        </a>
        <nav aria-label={lang === 'es' ? 'Navegación principal' : 'Navigation'}>
          <a href="#conexion">{c.nav[0]}</a>
          <a href="#como-funciona">{c.nav[1]}</a>
          <a href="#demo">{c.nav[2]}</a>
        </nav>
        <div className="m-header-actions">
          <LanguagePicker />
          <a className="m-nav-demo" href="/demo">
            {c.demo}
            <MoveUpRight size={16} />
          </a>
        </div>
      </header>
      <main>
        <section className="m-hero" aria-labelledby="m-title">
          <div className="m-hero-image">
            <img
              src="/marketing/encuentro-1942.webp"
              srcSet="/marketing/encuentro-960.webp 960w, /marketing/encuentro-1942.webp 1942w"
              sizes="100vw"
              fetchPriority="high"
              alt=""
              width="1942"
              height="809"
            />
          </div>
          <div className="m-hero-shade" />
          <div className="m-hero-copy">
            <p className="m-eyebrow">
              <i />
              {c.eyebrow}
            </p>
            <h1 id="m-title">
              {c.title[0]}
              <br />
              <em>{c.title[1]}</em>
              <br />
              {c.title[2]}
            </h1>
            <p className="m-intro">{c.intro}</p>
            <a className="m-cta" href="/demo">
              {c.demo}
              <ArrowRight size={20} />
            </a>
            <StoreSoon c={c} />
          </div>
          <div className="m-hero-foot">
            <a href="#conexion">
              <ArrowDown size={16} />
              {c.scroll}
            </a>
            <button type="button" aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
              {paused ? <Play size={14} /> : <Pause size={14} />}
              <span>{paused ? c.resume : c.pause}</span>
            </button>
          </div>
          <span className="m-photo-credit">{c.image}</span>
        </section>
        <div className="m-band" aria-label={c.band.join('. ')}>
          {c.band.map((v) => (
            <React.Fragment key={v}>
              <span>{v}</span>
              <Heart size={20} aria-hidden="true" />
            </React.Fragment>
          ))}
        </div>
        <section className="m-connection m-wrap" id="conexion">
          <div data-reveal>
            <p className="m-kicker">01 / {c.nav[0]}</p>
            <h2>{c.reason}</h2>
            <p className="m-body">{c.reasonText}</p>
            <div className="m-tags">
              {c.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="m-photo-stack" data-reveal>
            <img
              className="m-coast"
              src="/photos/coast.jpg"
              alt=""
              loading="lazy"
              width="700"
              height="900"
            />
            <img
              className="m-cafe"
              src="/photos/cafe.jpg"
              alt=""
              loading="lazy"
              width="500"
              height="600"
            />
            <span className="m-stamp">
              {c.stamp[0]}
              <br />
              {c.stamp[1]}
              <Heart size={26} />
            </span>
          </div>
        </section>
        <section className="m-how m-wrap" id="como-funciona">
          <div className="m-how-heading" data-reveal>
            <p className="m-kicker">02 / {c.nav[1]}</p>
            <h2>{c.how}</h2>
            <p className="m-body">{c.howIntro}</p>
          </div>
          <div className="m-steps">
            {c.steps.map(([title, description], i) => (
              <article key={title} data-reveal>
                <span className="m-step-number">0{i + 1}</span>
                {React.createElement([ArrowDown, MessageCircle, Heart][i], {
                  size: 25,
                  'aria-hidden': true,
                })}
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="m-demo" id="demo">
          <div className="m-wrap m-demo-grid">
            <div className="m-demo-copy" data-reveal>
              <p className="m-kicker">03 / {c.preview}</p>
              <h2>{c.previewTitle}</h2>
              <p className="m-body">{c.previewText}</p>
              <a className="m-cta" href="/demo">
                {c.demo}
                <ArrowRight size={20} />
              </a>
              <p className="m-disclaimer">{c.fictional}</p>
            </div>
            <div className="m-device-scene" data-reveal>
              <div className="m-phone">
                <div className="m-phone-bar">
                  <Brand />
                  <span>DEMO</span>
                </div>
                <div className="m-mini-profile">
                  <div>
                    <strong>{c.person}</strong>
                    <small>{c.place}</small>
                  </div>
                  <span>
                    <MessageCircle size={13} />
                    {c.write}
                  </span>
                </div>
                <img src="/photos/lucia.jpg" alt="" loading="lazy" width="420" height="500" />
                <div className="m-phone-body">
                  <p>{c.bio}</p>
                  <span>{c.shared}</span>
                  <div className="m-mini-tags">
                    <span>Café</span>
                    <span>Libertad</span>
                    <span>Música</span>
                  </div>
                </div>
                <div className="m-phone-nav">
                  <Heart />
                  <MessageCircle />
                  <ShieldCheck />
                </div>
              </div>
              <div className="m-bubble m-bubble-one">
                <MessageCircle size={16} />
                <span>{c.chat}</span>
              </div>
              <div className="m-bubble m-bubble-two">{c.reply}</div>
              <div className="m-date-float">
                <Heart size={18} />
                {c.invite}
              </div>
            </div>
          </div>
        </section>
        <section className="m-safety m-wrap" data-reveal>
          <ShieldCheck size={44} strokeWidth={1.3} />
          <h2>{c.safety}</h2>
          <p>{c.safetyText}</p>
        </section>
        <section className="m-final">
          <div className="m-final-photo" />
          <div className="m-final-inner m-wrap" data-reveal>
            <p className="m-kicker">ONLYFACHOS · +18</p>
            <h2>{c.final}</h2>
            <p className="m-body">{c.finalText}</p>
            <a className="m-cta" href="/demo">
              {c.demo}
              <ArrowRight size={20} />
            </a>
            <StoreSoon c={c} />
          </div>
        </section>
      </main>
      <footer className="m-footer m-wrap">
        <div>
          <a href="/" aria-label="OnlyFachos">
            <Brand />
          </a>
          <p>{c.age}</p>
          <small>{c.image}</small>
        </div>
        <div className="m-footer-links">
          {Object.entries(legalRoutes).map(([path], i) => (
            <a key={path} href={path} onClick={(e) => openLegal(e, path)}>
              {c.legal[i]}
            </a>
          ))}
          <a href="mailto:admin@webrom.cc">{c.contact}</a>
          <a href="/app">{c.login}</a>
        </div>
        <span className="m-copyright">© {new Date().getFullYear()} OnlyFachos · Webrom</span>
      </footer>
      {legal && (
        <Modal title={c.legal[Object.values(legalRoutes).indexOf(legal)]} onClose={closeLegal}>
          <Legal type={legal} />
        </Modal>
      )}
    </div>
  );
}

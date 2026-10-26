import { t, getLanguage, translateCommon } from './locale.mjs';
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Coffee,
  ImagePlus,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Send,
  Smile,
  Square,
  X,
  Zap,
} from 'lucide-react';
import { api } from './api';
import { Button, Modal, Photo } from './Shared';
import { Chips, compressPhoto } from './Onboarding';
import { DatePlanner, ConfirmedPlan } from './DatePlanner';
const PLANS = ['Un café', 'Una cena', 'Un asado', 'Un paseo', 'Sorpréndeme'];
const STICKERS = [
  'BASADO',
  'TOCA PASTO',
  'GIGACHAD',
  'COPIUM',
  'NPC',
  'DEBATE ME',
  'OK',
  '¿CITA YA?',
];
const time = (t) =>
  new Date(t).toLocaleTimeString(getLanguage(), { hour: '2-digit', minute: '2-digit' });
const readData = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

function DateDialog({ mode, invitationId, proposalId, detail, user, onClose, run }) {
  const [plan, setPlan] = useState('Un café'),
    [day, setDay] = useState(
      detail.invitations.find(
        (d) => d.status === 'accepted' && (!invitationId || d.id === invitationId),
      )?.day || '',
    ),
    [place, setPlace] = useState(
      detail.invitations.find(
        (d) => d.status === 'accepted' && (!invitationId || d.id === invitationId),
      )?.place || '',
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const accepted = proposalId
    ? detail.proposals?.find((p) => p.status === 'accepted' && p.id === proposalId)
    : detail.invitations.find(
        (d) => d.status === 'accepted' && (!invitationId || d.id === invitationId),
      );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'edit') await run('/invitations/' + accepted.id, 'PATCH', { day, place });
      else
        await run(
          '/conversations/' + detail.id + (mode === 'signal' ? '/signal' : '/invitations'),
          'POST',
          { plan },
        );
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        mode === 'celebrate'
          ? t('MATCH · LOS DOS DIJERON QUE SÍ')
          : mode === 'edit'
            ? t('COORDINEN EL PLAN')
            : t('ALERTA BASADA')
      }
      className={'date-dialog ' + (mode === 'celebrate' ? 'celebrate' : '')}
      onClose={onClose}
    >
      {mode === 'celebrate' ? (
        <>
          <h1>
            {t('¡ES UNA')}
            <br />
            {t('CITA!')}
          </h1>
          <div className="couple">
            <Photo profile={user} />
            <Photo profile={detail.profile} />
          </div>
          <strong>
            {user.name}
            {t(' y ')}
            {detail.profile.name}
          </strong>
          <div className="date-plan">
            <small>{t('EL PLAN')}</small>
            <b>{t(accepted?.plan || 'Un plan juntos')}</b>
            <p>
              {accepted?.day
                ? new Date(accepted.day).toLocaleString(getLanguage())
                : t('Día por elegir')}{' '}
              · {accepted?.place || t('Lugar por elegir')}
            </p>
          </div>
          <p>{t('Ahora no lleguen tarde.')}</p>
          <Button onClick={onClose}>{t('COORDINAR EN EL CHAT')}</Button>
        </>
      ) : (
        <form onSubmit={submit} className="form">
          {mode === 'edit' ? (
            <>
              <label>
                {t('Día y hora')}
                <input type="datetime-local" value={day} onChange={(e) => setDay(e.target.value)} />
              </label>
              <label>
                {t('Lugar')}
                <input
                  value={place}
                  maxLength={120}
                  placeholder={t('Un lugar público que les acomode')}
                  onChange={(e) => setPlace(e.target.value)}
                />
              </label>
              <p className="hint">
                {t('Ambos verán estos detalles en el chat. Confirmen juntos cualquier cambio.')}
              </p>
            </>
          ) : (
            <>
              <div className="date-prompt">
                <div className="couple">
                  <Photo profile={user} />
                  <Photo profile={detail.profile} />
                </div>
                <h2>
                  {detail.streak >= 3 ? (
                    <>
                      {t('LLEVAN ')}
                      {detail.streak}
                      {t(' DÍAS')}
                      <br />
                      {t('HABLANDO CON ')}
                      {detail.profile.name.toUpperCase()}
                    </>
                  ) : (
                    t('UNA BUENA CONVERSACIÓN MERECE UN BUEN PLAN.')
                  )}
                </h2>
                <h2>
                  <mark>{mode === 'signal' ? t('¿LE DAS LUZ VERDE?') : t('INVITA A SALIR')}</mark>
                </h2>
                {mode === 'signal' ? (
                  <p>
                    {t(
                      'Le mandaremos una señal discreta de que te gustaría recibir una invitación. No compartiremos disponibilidad que no hayas indicado.',
                    )}
                  </p>
                ) : (
                  <div className="date-stats">
                    <span>
                      <b>{detail.messageCount}</b>
                      {t('MENSAJES')}
                    </span>
                    <span>
                      <b>{detail.common.length}</b>
                      {t('EN COMÚN')}
                    </span>
                    <span>
                      <b>{detail.basedCount || 0}</b>
                      {t('BASADOS')}
                    </span>
                  </div>
                )}
              </div>
              {mode === 'signal' && (
                <div className="signal-preview">
                  <Zap size={22} />
                  <p>
                    <b>
                      {t('Lo que verá ')}
                      {detail.profile.name}
                    </b>
                    <br />
                    {user.name}
                    {t(' tiene ganas de compartir un plan contigo.')}
                  </p>
                </div>
              )}
              <Chips
                label={
                  mode === 'signal' ? t('SI TE INVITA, PREFERIRÍAS…') : t('¿A QUÉ LE INVITAS?')
                }
                choices={PLANS}
                value={plan}
                onChange={setPlan}
              />
              <p className="hint">
                {mode === 'signal'
                  ? t('La señal no acepta una cita por ti. Ambos deben confirmar la invitación.')
                  : t(
                      'Si acepta, es una cita. Si rechaza, el chat sigue abierto y nadie más lo ve.',
                    )}
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {t(error)}
            </p>
          )}
          <Button disabled={busy || (!plan && mode !== 'edit')}>
            {busy ? (
              <LoaderCircle className="spin" />
            ) : mode === 'edit' ? (
              t('GUARDAR EL PLAN')
            ) : mode === 'signal' ? (
              t('SÍ, QUE ME INVITE')
            ) : (
              t('ENVIAR INVITACIÓN')
            )}
          </Button>
          <button type="button" className="secondary button" onClick={onClose}>
            {mode === 'edit' ? t('Cancelar') : t('Todavía no')}
          </button>
        </form>
      )}
    </Modal>
  );
}

export default function Conversations({
  user,
  conversations,
  active,
  setActive,
  onBack,
  backToCommunity,
  refresh,
  notify,
  safety,
  onDiscover,
}) {
  const [detail, setDetail] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [text, setText] = useState(''),
    [sending, setSending] = useState(false),
    [stickers, setStickers] = useState(false),
    [dialog, setDialog] = useState(null),
    [recording, setRecording] = useState(false),
    [listMode, setListMode] = useState('all'),
    [chatSearch, setChatSearch] = useState('');
  const end = useRef(),
    generation = useRef(0),
    recorder = useRef(),
    stream = useRef(),
    recordTimer = useRef(),
    audioChunks = useRef([]),
    activeRef = useRef(active);
  activeRef.current = active;
  async function load(id = active) {
    if (!id) return;
    const result = await api('/conversations/' + id);
    if (id === activeRef.current) {
      setDetail(result);
      const through = Math.max(
        0,
        ...result.messages.filter((m) => m.senderId !== user.id).map((m) => m.createdAt),
      );
      if (through && document.visibilityState === 'visible') {
        await api('/conversations/' + id + '/read', { method: 'POST', body: { through } });
        if (result.unread) await refresh();
      }
    }
    return result;
  }
  useEffect(() => {
    const v = ++generation.current;
    setDetail(null);
    setText('');
    setStickers(false);
    setDialog(null);
    setError('');
    setRecording(false);
    if (!active) return;
    setLoading(true);
    const fetchDetail = () =>
      load(active)
        .then((r) => {
          if (v === generation.current) setDetail(r);
        })
        .catch((e) => {
          if (v === generation.current) setError(e.message);
        })
        .finally(() => {
          if (v === generation.current) setLoading(false);
        });
    fetchDetail();
    const t = setInterval(fetchDetail, 4000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [detail?.messages.length, stickers]);
  useEffect(
    () => () => {
      clearTimeout(recordTimer.current);
      if (recorder.current?.state === 'recording') {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [active],
  );
  async function send(kind = 'text', content = text) {
    if (!content.trim() || sending || !active) return;
    const id = active;
    setSending(true);
    try {
      await api('/conversations/' + id + '/messages', {
        method: 'POST',
        body: { kind, text: content },
      });
      if (id === activeRef.current) {
        if (kind === 'text') setText('');
        setStickers(false);
        await load(id);
      }
      await refresh();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setSending(false);
    }
  }
  async function run(path, method, body) {
    const r = await api(path, { method, body });
    await load();
    await refresh();
    return r;
  }
  async function respond(invite, accept, demo = false) {
    if (sending) return;
    setSending(true);
    try {
      await run('/invitations/' + invite.id + (demo ? '/demo-answer' : '/answer'), 'POST', {
        accept,
      });
      if (accept) setDialog({ mode: 'celebrate', invitationId: invite.id });
      else notify('Invitación cerrada. Pueden seguir conversando.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setSending(false);
    }
  }
  async function acceptProposal(proposal, demo = false) {
    if (sending) return;
    setSending(true);
    try {
      await run('/proposals/' + proposal.id + '/answer', 'POST', { accept: true, demo });
      setDialog({ mode: 'celebrate', proposalId: proposal.id });
    } catch (e) {
      notify(e.message, true);
    } finally {
      setSending(false);
    }
  }
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await send('image', await compressPhoto(file));
    } catch (e) {
      notify(e.message, true);
    }
    e.target.value = '';
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      return notify('Este navegador no admite grabación de voz. Puedes seguir escribiendo.', true);
    const id = active;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== activeRef.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const type = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!type) {
        stream.current.getTracks().forEach((t) => t.stop());
        return notify('No hay un formato de audio compatible.', true);
      }
      const r = new MediaRecorder(stream.current, { mimeType: type, audioBitsPerSecond: 64000 });
      recorder.current = r;
      audioChunks.current = [];
      r.ondataavailable = (e) => {
        if (e.data.size) audioChunks.current.push(e.data);
      };
      r.onstop = async () => {
        clearTimeout(recordTimer.current);
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks.current, { type });
        if (blob.size > 1_500_000) return notify('El audio es demasiado largo.', true);
        if (activeRef.current === id) await send('audio', await readData(blob));
      };
      r.start();
      setRecording(true);
      recordTimer.current = setTimeout(() => {
        if (r.state === 'recording') r.stop();
      }, 60000);
    } catch (e) {
      notify(
        e.name === 'NotAllowedError'
          ? 'No se concedió permiso al micrófono. Puedes escribir o enviar fotos.'
          : 'No pudimos grabar el audio.',
        true,
      );
    }
  }
  const peer = detail?.profile || conversations.find((c) => c.id === active)?.profile;
  if (!conversations.length)
    return (
      <div className="empty-state chat-empty">
        <MessageCircle size={36} />
        <h1>
          {t('EL HOLA')}
          <br />
          {t('LO PONES TÚ.')}
        </h1>
        <p>
          {t(
            'No necesitas un match para empezar. Encuentra un perfil en la comunidad y pulsa «Escribir».',
          )}
        </p>
        <Button onClick={onDiscover}>{t('EXPLORAR LA COMUNIDAD')}</Button>
      </div>
    );
  return (
    <div className={`chat-layout ${active ? 'has-active' : ''}`}>
      <aside className="chat-list">
        <div className="chat-list-title">
          <span className="label-strip">{t('SIN RODEOS')}</span>
          <h1>
            {t('TUS CHATS')}
            <span> ({conversations.length})</span>
          </h1>
        </div>
        <div className="chat-filters">
          <input
            aria-label={t('Buscar conversaciones')}
            placeholder={t('Buscar conversación…')}
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
          />
          <div className="segmented">
            {[
              ['all', 'Todos'],
              ['unread', 'Sin leer'],
              ['dates', 'Citas'],
              ['archived', 'Archivados'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={listMode === id ? 'selected' : ''}
                aria-pressed={listMode === id}
                onClick={() => setListMode(id)}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <small className="hint">
            {t('Sin actividad en 14 días: pasan a Archivados. Un mensaje nuevo las recupera.')}
          </small>
        </div>
        {conversations
          .filter(
            (c) =>
              (listMode === 'archived' ? c.archived : !c.archived) &&
              (listMode !== 'unread' || c.unread > 0) &&
              (listMode !== 'dates' || c.proposals?.some((p) => p.status === 'accepted')) &&
              c.profile.name.toLowerCase().includes(chatSearch.toLowerCase()),
          )
          .map((c) => (
            <button
              key={c.id}
              className={
                'chat-person ' + (active === c.id ? 'active' : '') + (c.unread ? ' is-unread' : '')
              }
              onClick={() => setActive(c.id)}
            >
              <Photo profile={c.profile} className="avatar" />
              <span>
                <strong>
                  {c.profile.name}
                  {c.invitations.some((d) => d.status === 'accepted') && <Coffee size={15} />}
                </strong>
                <p>
                  {c.proposals?.find((p) => p.status === 'accepted')
                    ? '☕ ' +
                      new Date(
                        c.proposals.find((p) => p.status === 'accepted').day,
                      ).toLocaleDateString(getLanguage()) +
                      ' · ' +
                      c.proposals.find((p) => p.status === 'accepted').place
                    : c.lastMessage?.text || t('Di hola. Lo demás se conversa.')}
                </p>
                <small>
                  {c.streak > 0
                    ? '🔥 ' + c.streak + t(' días de racha')
                    : t('Conversación abierta')}
                </small>
              </span>
              {c.unread > 0 && (
                <span className="unread-count" aria-label={c.unread + t(' mensajes sin leer')}>
                  {c.unread}
                </span>
              )}
              {c.lastMessage && <time>{time(c.lastMessage.createdAt)}</time>}
            </button>
          ))}
      </aside>
      <section className="chat-conversation">
        {!active ? (
          <div className="empty-state">
            <MessageCircle size={32} />
            <h2>{t('ELIGE UNA CONVERSACIÓN.')}</h2>
            <p>{t('Tu próximo plan puede empezar con un mensaje.')}</p>
          </div>
        ) : (
          <>
            <header className="chat-heading">
              <button
                className="icon-button chat-back"
                aria-label={backToCommunity ? t('Volver al feed') : t('Volver a conversaciones')}
                onClick={onBack}
              >
                <ArrowLeft size={20} />
              </button>
              <Photo profile={peer} className="avatar" />
              <div>
                <h2>{peer?.name || t('Conversación')}</h2>
                <small>
                  {detail?.streak > 0
                    ? t('RACHA · ') + detail.streak + t(' DÍAS')
                    : user.demo
                      ? t('CHAT SIMULADO')
                      : t('SIN MATCH PREVIO')}
                </small>
              </div>
              <button
                className="icon-button"
                aria-label={t('Opciones de seguridad')}
                onClick={() => safety(peer)}
                disabled={!peer}
              >
                <MoreHorizontal size={22} />
              </button>
            </header>
            <section className="chat-date-actions" aria-label={t('Citas recíprocas')}>
              <p>
                {t(
                  'Tú también puedes dar el primer paso. La cita se confirma cuando ambos aceptan.',
                )}
              </p>
              <div>
                <Button disabled={!detail} onClick={() => setDialog('plan')}>
                  <Coffee size={17} />
                  {t('Invitar a salir')}
                </Button>
                <Button
                  className="secondary"
                  disabled={!detail}
                  onClick={() => setDialog('signal')}
                >
                  <Zap size={17} />
                  {t('Dar luz verde')}
                </Button>
              </div>
            </section>
            {detail?.proposals?.find((p) => p.status === 'accepted') && (
              <ConfirmedPlan
                plan={detail.proposals.find((p) => p.status === 'accepted')}
                peer={peer}
                notify={notify}
                onChange={() => setDialog('plan')}
              />
            )}
            {!!detail?.common.length && (
              <div className="chat-common">
                <strong>{t('EN COMÚN')}</strong>
                {detail.common.slice(0, 4).map((v) => (
                  <span key={v}>{translateCommon(v)}</span>
                ))}
              </div>
            )}
            <div className="chat-messages" aria-live="polite">
              {loading ? (
                <div className="loading">
                  <LoaderCircle className="spin" />
                </div>
              ) : error ? (
                <div className="empty-state">
                  <p>{t(error)}</p>
                  <Button
                    onClick={() => {
                      setError('');
                      load().catch((e) => setError(e.message));
                    }}
                  >
                    {t('REINTENTAR')}
                  </Button>
                </div>
              ) : (
                detail && (
                  <>
                    <div className="conversation-note">
                      {user.demo
                        ? t('Perfiles ficticios · mensajes y respuestas simulados')
                        : t('Este chat es directo. Conversa con respeto y comparte a tu ritmo.')}
                    </div>
                    {detail.signal && (
                      <div className="signal-preview">
                        <Zap size={20} />
                        <p>
                          <strong>
                            {peer.name}
                            {t(' tiene ganas de compartir un plan contigo.')}
                          </strong>
                          <br />
                          {detail.signal.plan && 'Le gustaría: ' + detail.signal.plan + '. '}
                          {t('¿Te animas a invitar?')}
                        </p>
                        <button className="text-link" onClick={() => setDialog('plan')}>
                          {t('Invitar')}
                        </button>
                      </div>
                    )}
                    {detail.messages.map((m, i) => {
                      const dateLabel = new Date(m.createdAt).toLocaleDateString(getLanguage(), {
                        day: 'numeric',
                        month: 'short',
                      });
                      const dayBefore = i
                        ? new Date(detail.messages[i - 1].createdAt).toDateString()
                        : null;
                      return (
                        <React.Fragment key={m.id}>
                          {(!i || dayBefore !== new Date(m.createdAt).toDateString()) && (
                            <div className="message-day">{dateLabel}</div>
                          )}
                          <div className={'message-wrap ' + (m.senderId === user.id ? 'own' : '')}>
                            <div className={'message ' + m.kind}>
                              {m.kind === 'image' ? (
                                <img
                                  src={m.text}
                                  alt={
                                    t('Foto compartida por ') +
                                    (m.senderId === user.id ? t('ti') : peer.name)
                                  }
                                />
                              ) : m.kind === 'audio' ? (
                                <audio
                                  controls
                                  preload="metadata"
                                  src={m.text}
                                  aria-label={t('Mensaje de voz')}
                                />
                              ) : m.kind === 'sticker' ? (
                                <span className="sticker-message">{m.text}</span>
                              ) : (
                                <p>{m.text}</p>
                              )}
                              <small>
                                {time(m.createdAt)} {m.senderId === user.id && <Check size={12} />}
                              </small>
                            </div>
                            <div className="reaction-row">
                              {['🔥', '❤️', '😂', 'BASADO'].map((r) => (
                                <button
                                  key={r}
                                  aria-label={t('Reaccionar ') + r + t(' al mensaje ') + (i + 1)}
                                  aria-pressed={m.reactions.some(
                                    (v) => v.userId === user.id && v.reaction === r,
                                  )}
                                  onClick={async () => {
                                    try {
                                      await run('/conversations/' + active + '/reactions', 'POST', {
                                        messageId: m.id,
                                        reaction: r,
                                      });
                                    } catch (e) {
                                      notify(e.message, true);
                                    }
                                  }}
                                >
                                  {r}
                                  {m.reactions.filter((v) => v.reaction === r).length || ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {detail.streak >= 3 &&
                      !detail.invitations.some(
                        (d) => d.status === 'pending' || d.status === 'accepted',
                      ) && (
                        <div className="date-nudge">
                          <span>{t('ALERTA BASADA')}</span>
                          <h3>
                            {detail.streak}
                            {t(' DÍAS HABLANDO.')}
                            <br />
                            {t('¿LO LLEVAN A UN CAFÉ?')}
                          </h3>
                          <div>
                            <button onClick={() => setDialog('plan')}>
                              {t('Invitar a salir ')}
                              <Coffee size={14} />
                            </button>
                            <button onClick={() => setDialog('signal')}>
                              {t('Dar luz verde ')}
                              <Zap size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    {detail.proposals?.map((p) => (
                      <div className="proposal-card" key={p.id}>
                        <small>
                          {p.status === 'accepted'
                            ? t('LOS DOS DIJERON QUE SÍ')
                            : p.status === 'pending'
                              ? t('PROPUESTA DE CITA')
                              : p.status === 'superseded'
                                ? t('PLAN ANTERIOR')
                                : t('PROPUESTA CERRADA')}
                        </small>
                        <h3>{new Date(p.day).toLocaleString(getLanguage())}</h3>
                        <p>{p.place}</p>
                        <small>
                          {t('Propuesto en ')}
                          {p.timezone}
                          {t(' · Se muestra en tu horario')}
                        </small>
                        {p.status === 'pending' && (
                          <>
                            <p>
                              {p.senderId === user.id
                                ? t('Esperando respuesta. La cita aún no está confirmada.')
                                : peer.name + t(' te propone este plan.')}
                            </p>
                            <div className="beta-actions">
                              {p.senderId !== user.id ? (
                                <>
                                  <Button disabled={sending} onClick={() => acceptProposal(p)}>
                                    {t('ACEPTAR')}
                                  </Button>
                                  <button
                                    className="button secondary"
                                    onClick={async () => {
                                      try {
                                        await run('/proposals/' + p.id + '/answer', 'POST', {
                                          accept: false,
                                        });
                                        setDialog('plan');
                                      } catch (e) {
                                        notify(e.message, true);
                                      }
                                    }}
                                  >
                                    {t('SUGERIR OTRO')}
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="text-link"
                                  onClick={() =>
                                    run('/proposals/' + p.id, 'DELETE').catch((e) =>
                                      notify(e.message, true),
                                    )
                                  }
                                >
                                  {t('Retirar propuesta')}
                                </button>
                              )}
                            </div>
                            {p.senderId === user.id && user.demo && (
                              <button
                                className="text-link"
                                disabled={sending}
                                onClick={() => acceptProposal(p, true)}
                              >
                                {t('Simular aceptación · SOLO DEMO')}
                              </button>
                            )}
                          </>
                        )}
                        {p.status === 'accepted' && (
                          <button
                            className="text-link"
                            onClick={() => setDialog({ mode: 'celebrate', proposalId: p.id })}
                          >
                            {t('Ver nuestro match')} <HeartIcon />
                          </button>
                        )}
                      </div>
                    ))}
                    {detail.invitations.map((d) => (
                      <div className={'invitation-card status-' + d.status} key={d.id}>
                        <small>
                          {d.status === 'accepted'
                            ? t('MATCH · LOS DOS DIJERON QUE SÍ')
                            : d.status === 'declined'
                              ? t('LA CONVERSACIÓN SIGUE')
                              : t('INVITACIÓN A UNA CITA')}
                        </small>
                        <h3>
                          {d.status === 'accepted'
                            ? t('¡ES UNA CITA!')
                            : d.status === 'declined'
                              ? t('NO SE CONCRETÓ ESTA VEZ.')
                              : d.senderId === user.id
                                ? t('TU INVITACIÓN ESTÁ EN CAMINO.')
                                : peer.name.toUpperCase() + t(' TE INVITA A SALIR.')}
                        </h3>
                        <span className="plan-chip">{d.plan}</span>
                        {d.status === 'pending' ? (
                          d.senderId === user.id ? (
                            <>
                              <p>
                                {t('Esperando una respuesta. Todavía no hay una cita confirmada.')}
                              </p>
                              {user.demo && (
                                <div className="demo-controls">
                                  <span>{t('SIMULAR RESPUESTA · SOLO DEMO')}</span>
                                  <button disabled={sending} onClick={() => respond(d, true, true)}>
                                    {t('Simular aceptación')}
                                  </button>
                                  <button
                                    disabled={sending}
                                    onClick={() => respond(d, false, true)}
                                  >
                                    {t('Simular rechazo')}
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="invitation-actions">
                              <Button disabled={sending} onClick={() => respond(d, true)}>
                                {t('SÍ, ME SUMO')}
                              </Button>
                              <button disabled={sending} onClick={() => respond(d, false)}>
                                {t('Esta vez no')}
                              </button>
                            </div>
                          )
                        ) : d.status === 'accepted' ? (
                          <>
                            <p>
                              {d.day
                                ? new Date(d.day).toLocaleString(getLanguage())
                                : t('Día por elegir')}{' '}
                              · {d.place || t('Lugar por elegir')}
                            </p>
                            <div className="invitation-actions">
                              <button onClick={() => setDialog('plan')}>
                                <Calendar size={15} />
                                {t(' Elegir día y lugar')}
                              </button>
                              <button
                                onClick={() => setDialog({ mode: 'celebrate', invitationId: d.id })}
                              >
                                {t('Ver nuestra cita ')}
                                <HeartIcon />
                              </button>
                            </div>
                          </>
                        ) : (
                          <p>{t('No se cierra el chat. Pueden seguir conversando sin presión.')}</p>
                        )}
                      </div>
                    ))}
                    <div ref={end} />
                  </>
                )
              )}
            </div>
            {stickers && (
              <section className="sticker-tray" aria-label={t('Stickers')}>
                <div>
                  <b>{t('Stickers')}</b>
                  <span>{t('GIFs · próximamente')}</span>
                  <small>{t('PRO · PRÓXIMAMENTE')}</small>
                  <button
                    className="icon-button"
                    aria-label={t('Cerrar stickers')}
                    onClick={() => setStickers(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="sticker-grid">
                  {STICKERS.map((s, i) => (
                    <button
                      key={s}
                      className={'sticker-style-' + i}
                      disabled={sending}
                      onClick={() => send('sticker', s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <form
              className="message-form"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label className="icon-button media-input" title={t('Enviar foto')}>
                <ImagePlus size={20} />
                <input
                  aria-label={t('Enviar foto')}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={upload}
                  disabled={sending}
                />
              </label>
              <input
                value={text}
                disabled={recording}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                aria-label={t('Escribe un mensaje')}
                placeholder={
                  recording ? t('Grabando · máximo 60 segundos…') : t('Escribe algo basado…')
                }
              />
              <button
                type="button"
                className={stickers ? 'active' : ''}
                aria-label={t('Abrir stickers')}
                onClick={() => setStickers(!stickers)}
                disabled={!detail}
              >
                <Smile size={21} />
              </button>
              {text.trim() ? (
                <button aria-label={t('Enviar mensaje')} disabled={sending || !detail}>
                  {sending ? <LoaderCircle className="spin" size={19} /> : <Send size={20} />}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={recording ? t('Detener y enviar audio') : t('Grabar mensaje de voz')}
                  className={recording ? 'recording' : ''}
                  disabled={sending || !detail}
                  onClick={record}
                >
                  {recording ? <Square size={18} /> : <Mic size={20} />}
                </button>
              )}
            </form>
          </>
        )}
      </section>
      {dialog === 'plan' && detail && (
        <DatePlanner detail={detail} run={run} onClose={() => setDialog(null)} />
      )}
      {dialog && dialog !== 'plan' && detail && (
        <DateDialog
          key={
            typeof dialog === 'string'
              ? dialog
              : dialog.mode + (dialog.invitationId || dialog.proposalId)
          }
          mode={typeof dialog === 'string' ? dialog : dialog.mode}
          invitationId={dialog.invitationId}
          proposalId={dialog.proposalId}
          detail={detail}
          user={user}
          onClose={() => setDialog(null)}
          run={run}
        />
      )}
    </div>
  );
}
function HeartIcon() {
  return <span aria-hidden="true">♥</span>;
}

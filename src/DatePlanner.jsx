import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Shield, Share2 } from 'lucide-react';
import { Button, Modal } from './Shared';
const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function DatePlanner({ detail, onClose, run }) {
  const [step, setStep] = useState(1),
    [day, setDay] = useState(localDate(new Date(Date.now() + 86400000))),
    [hour, setHour] = useState('11:00'),
    [place, setPlace] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000)),
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function submit(e) {
    e.preventDefault();
    setError('');
    const date = new Date(day + 'T' + hour);
    if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now())
      return setError('Elige una fecha y hora futuras.');
    if (step === 1) {
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      await run('/conversations/' + detail.id + '/proposals', 'POST', {
        day: date.toISOString(),
        place,
        timezone: zone,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={'CITA CON ' + detail.profile.name.toUpperCase()}
      className="date-planner"
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <div className="planner-progress">
          <button
            type="button"
            className="icon-button"
            aria-label="Volver"
            onClick={() => (step === 1 ? onClose() : setStep(1))}
          >
            <ArrowLeft />
          </button>
          <i />
          <i className={step === 2 ? 'done' : ''} />
          <small>{step}/2</small>
        </div>
        <span className="label-strip">UN BUEN PLAN EMPIEZA AQUÍ</span>
        <h1>{step === 1 ? '¿QUÉ DÍA?' : '¿DÓNDE?'}</h1>
        {step === 1 ? (
          <>
            <p>Propón un momento para verse. {detail.profile.name} podrá aceptar o sugerir otro.</p>
            <div className="day-tiles">
              {days.map((d) => (
                <button
                  type="button"
                  key={localDate(d)}
                  className={day === localDate(d) ? 'selected' : ''}
                  onClick={() => setDay(localDate(d))}
                >
                  <small>{d.toLocaleDateString('es', { weekday: 'short' })}</small>
                  <b>{d.getDate()}</b>
                </button>
              ))}
            </div>
            <label>
              Otra fecha
              <input
                type="date"
                required
                min={localDate(new Date())}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <h4>¿A QUÉ HORA?</h4>
            <div className="time-tiles">
              {['10:00', '11:00', '12:30', '16:00', '17:30'].map((t) => (
                <button
                  type="button"
                  key={t}
                  className={hour === t ? 'selected' : ''}
                  onClick={() => setHour(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <label>
              Hora personalizada
              <input required type="time" value={hour} onChange={(e) => setHour(e.target.value)} />
            </label>
            <small className="hint">
              Horario de {zone}. No mostramos disponibilidad compartida porque aún no la han
              declarado.
            </small>
            <div className="beta-panel safety-note">
              <Shield size={20} />
              Para una primera cita, recomendamos de día y en un lugar público.
            </div>
          </>
        ) : (
          <>
            <div className="proposal-summary">
              <Calendar />
              {new Date(day + 'T' + hour).toLocaleString('es-CL')}
              <small>{zone}</small>
            </div>
            <h3>UN LUGAR QUE LES ACOMODE</h3>
            <p>
              Acuerden un lugar público. Incluye nombre, dirección y ciudad para que no haya dudas.
            </p>
            <label>
              Lugar de encuentro
              <input
                required
                minLength={3}
                maxLength={160}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Café, dirección y ciudad"
              />
            </label>
            <a
              className="button secondary"
              href={
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(place || 'cafeterías en ' + detail.profile.city)
              }
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={18} />
              Buscar en el mapa
            </a>
            <p className="hint">
              La beta no tiene locales aliados ni descuentos. El mapa abre una búsqueda con el texto
              que escribas.
            </p>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy}>
          {step === 1 ? (
            <>
              ELEGIR LUGAR <ArrowRight size={18} />
            </>
          ) : (
            'ENVIAR PROPUESTA'
          )}
        </Button>
        <small className="hint">
          La cita queda confirmada cuando la otra persona acepta día y lugar.
        </small>
      </form>
    </Modal>
  );
}
function calendar(plan) {
  const stamp = (v) => new Date(v).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&');
  const text = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OnlyFachos//Beta1//ES',
    'BEGIN:VEVENT',
    'UID:' + plan.id + '@onlyfachos',
    'DTSTAMP:' + stamp(Date.now()),
    'DTSTART:' + stamp(plan.day),
    'DTEND:' + stamp(Date.parse(plan.day) + 3600000),
    'SUMMARY:Cita · OnlyFachos',
    'LOCATION:' + escape(plan.place),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' })),
    a = document.createElement('a');
  a.href = url;
  a.download = 'mi-cita.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ConfirmedPlan({ plan, peer, onChange, notify }) {
  async function share() {
    const text = `Mi plan: ${new Date(plan.day).toLocaleString('es-CL')} · ${plan.place}. Cita con ${peer.name}.`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mi plan de cita', text });
      else {
        await navigator.clipboard.writeText(text);
        notify('Plan copiado. Tú eliges con quién compartirlo.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') notify('No pudimos compartir el plan.', true);
    }
  }
  return (
    <section className="confirmed-plan">
      <b>☕ CITA CONFIRMADA</b>
      <p>
        {new Date(plan.day).toLocaleString('es-CL')} · {plan.place}
      </p>
      <small>Horario mostrado en tu zona · {plan.timezone} al proponer</small>
      <div>
        <button onClick={() => calendar(plan)}>
          <Calendar size={14} />
          Calendario
        </button>
        <a
          href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(plan.place)}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={14} />
          Cómo llegar
        </a>
        <button onClick={onChange}>Cambiar</button>
        <button onClick={share}>
          <Share2 size={14} />
          Compartir plan
        </button>
      </div>
    </section>
  );
}

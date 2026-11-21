import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock3,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';
import { api } from './api';
import { getLanguage, t } from './locale.mjs';
import { useLanguage } from './LanguagePicker';
import './moderation.css';

const reportLabels = {
  pending: 'Pendiente',
  reviewing: 'En revisión',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
};
const userLabels = { active: 'Activo', suspended: 'Suspendido', blocked: 'Bloqueado' };

function date(value) {
  return new Intl.DateTimeFormat(getLanguage(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

function Status({ children, tone = '' }) {
  return <span className={'moderation-status ' + tone}>{children}</span>;
}

function LoginRequired() {
  return (
    <main className="moderation-shell">
      <section className="moderation-card moderation-empty">
        <ShieldAlert size={34} />
        <h1>{t('Panel privado')}</h1>
        <p>{t('Inicia sesión con una cuenta autorizada para continuar.')}</p>
        <a className="button" href="/app">
          {t('Ir al acceso')}
        </a>
      </section>
    </main>
  );
}

export default function ModerationPage() {
  useLanguage();
  const [authorized, setAuthorized] = useState(null);
  const [reports, setReports] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('pending');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadEpoch = useRef(0);
  const selectionEpoch = useRef(0);

  async function selectReport(id) {
    const epoch = ++selectionEpoch.current;
    setSelected(null);
    setReason('');
    try {
      const detail = await api('/moderation/reports/' + id);
      if (epoch === selectionEpoch.current) setSelected(detail);
    } catch (e) {
      if (epoch === selectionEpoch.current) setError(e.message);
    }
  }

  async function load() {
    const epoch = ++loadEpoch.current;
    const detailEpoch = ++selectionEpoch.current;
    setError('');
    setLoading(true);
    try {
      const me = await api('/moderation/me');
      if (epoch !== loadEpoch.current) return;
      setAuthorized(me);
      const [reportData, auditData, detail] = await Promise.all([
        api('/moderation/reports?status=' + status + '&offset=' + offset),
        api('/moderation/audit?limit=50'),
        selected ? api('/moderation/reports/' + selected.report.id).catch(() => null) : null,
      ]);
      if (epoch !== loadEpoch.current) return;
      setReports(reportData.reports);
      setTotal(reportData.total);
      setAudit(auditData.audit);
      if (detailEpoch === selectionEpoch.current) setSelected(detail);
    } catch (e) {
      if (epoch !== loadEpoch.current) return;
      if (e.status === 401 || e.status === 403) setAuthorized(false);
      else setError(e.message);
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      ++loadEpoch.current;
      ++selectionEpoch.current;
    };
  }, [status, offset]);

  async function refresh() {
    setWorking(true);
    try {
      await load();
    } catch (e) {
      if (e.status === 401 || e.status === 403) setAuthorized(false);
      else setError(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function updateReport(nextStatus) {
    if (!selected || reason.trim().length < 3) return;
    setWorking(true);
    try {
      await api('/moderation/reports/' + selected.report.id, {
        method: 'PATCH',
        body: { status: nextStatus, reason: reason.trim() },
      });
      setReason('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function updateUser(nextStatus) {
    if (!selected || !reason.trim() || selected.report.target.status === nextStatus) return;
    const durationHours = nextStatus === 'suspended' ? 72 : null;
    if (!window.confirm(t('¿Confirmas cambiar el estado de este usuario?'))) return;
    setWorking(true);
    try {
      await api('/moderation/users/' + selected.report.target.id + '/status', {
        method: 'PATCH',
        body: { status: nextStatus, reason: reason.trim(), durationHours },
      });
      setReason('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  }

  if (authorized === false) return <LoginRequired />;
  if (!authorized) {
    return (
      <main className="moderation-shell">
        <section className="moderation-card moderation-empty">
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button className="button" disabled={loading} onClick={refresh}>
                {t('Reintentar')}
              </button>
            </>
          ) : (
            t('Cargando panel…')
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="moderation-shell">
      <header className="moderation-header">
        <div>
          <a className="moderation-back" href="/app">
            <ArrowLeft size={16} /> {t('Volver a la app')}
          </a>
          <h1>{t('Moderación')}</h1>
          <p>
            {authorized.email} · {authorized.role}
          </p>
        </div>
        <button
          className="icon-button"
          onClick={refresh}
          disabled={working || loading}
          aria-label={t('Actualizar')}
        >
          <RefreshCw size={19} />
        </button>
      </header>
      {error && (
        <div className="moderation-error" role="alert">
          {error}
        </div>
      )}
      <section className="moderation-layout">
        <div className="moderation-card">
          <div className="moderation-toolbar">
            <h2>{t('Denuncias')}</h2>
            <select
              value={status}
              disabled={working || loading}
              onChange={(e) => {
                setStatus(e.target.value);
                setOffset(0);
                setSelected(null);
              }}
              aria-label={t('Filtrar por estado')}
            >
              <option value="pending">{t('Pendientes')}</option>
              <option value="reviewing">{t('En revisión')}</option>
              <option value="resolved">{t('Resueltas')}</option>
              <option value="dismissed">{t('Descartadas')}</option>
              <option value="all">{t('Todas')}</option>
            </select>
          </div>
          {reports.length ? (
            reports.map((report) => (
              <button
                className={
                  'moderation-report' + (selected?.report.id === report.id ? ' selected' : '')
                }
                key={report.id}
                disabled={working || loading}
                onClick={() => selectReport(report.id)}
              >
                <span>
                  <b>{report.target?.name || t('Cuenta eliminada')}</b>
                  <small>{report.reason}</small>
                </span>
                <Status tone={report.status}>{t(reportLabels[report.status])}</Status>
              </button>
            ))
          ) : (
            <p className="moderation-muted">
              {t(loading ? 'Cargando panel…' : 'No hay denuncias con este estado.')}
            </p>
          )}
          <nav className="moderation-toolbar" aria-label={t('Denuncias')}>
            <button
              className="button secondary"
              disabled={working || loading || !offset}
              onClick={() => {
                setOffset(Math.max(0, offset - 25));
                setSelected(null);
              }}
            >
              {t('Anterior')}
            </button>
            <span>
              {total ? Math.floor(offset / 25) + 1 : 0} / {Math.ceil(total / 25)}
            </span>
            <button
              className="button secondary"
              disabled={working || loading || offset + 25 >= total}
              onClick={() => {
                setOffset(offset + 25);
                setSelected(null);
              }}
            >
              {t('Siguiente')}
            </button>
          </nav>
        </div>
        <div className="moderation-card moderation-detail">
          {selected ? (
            <>
              <div className="moderation-detail-heading">
                <div>
                  <span className="moderation-kicker">{t('Denuncia')}</span>
                  <h2>{selected.report.target?.name || t('Cuenta eliminada')}</h2>
                </div>
                <Status tone={selected.report.status}>
                  {t(reportLabels[selected.report.status])}
                </Status>
              </div>
              <dl className="moderation-facts">
                <div>
                  <dt>{t('Motivo')}</dt>
                  <dd>{selected.report.reason}</dd>
                </div>
                <div>
                  <dt>{t('Detalle')}</dt>
                  <dd>{selected.report.details || t('Sin detalles')}</dd>
                </div>
                <div>
                  <dt>{t('Denunciante')}</dt>
                  <dd>{selected.report.reporter?.name || t('Cuenta eliminada')}</dd>
                </div>
                <div>
                  <dt>{t('Fecha')}</dt>
                  <dd>{date(selected.report.createdAt)}</dd>
                </div>
                <div>
                  <dt>{t('Estado del usuario')}</dt>
                  <dd>
                    <Status tone={selected.report.target?.status}>
                      {t(userLabels[selected.report.target?.status])}
                    </Status>
                  </dd>
                </div>
              </dl>
              <label className="moderation-reason">
                {t('Motivo de la decisión')}
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('Escribe por qué se toma esta decisión')}
                />
              </label>
              <div className="moderation-actions">
                <button
                  className="button secondary"
                  disabled={working || loading || reason.trim().length < 3}
                  onClick={() => updateReport('reviewing')}
                >
                  <Clock3 size={16} /> {t('Revisar')}
                </button>
                <button
                  className="button"
                  disabled={working || loading || reason.trim().length < 3}
                  onClick={() => updateReport('resolved')}
                >
                  <Check size={16} /> {t('Resolver')}
                </button>
                <button
                  className="button secondary"
                  disabled={working || loading || reason.trim().length < 3}
                  onClick={() => updateReport('dismissed')}
                >
                  <X size={16} /> {t('Descartar')}
                </button>
              </div>
              <div className="moderation-actions moderation-user-actions">
                <button
                  className="button danger"
                  disabled={working || loading || reason.trim().length < 3}
                  onClick={() => updateUser('blocked')}
                >
                  <LockKeyhole size={16} /> {t('Bloquear usuario')}
                </button>
                <button
                  className="button secondary"
                  disabled={working || loading || reason.trim().length < 3}
                  onClick={() => updateUser('suspended')}
                >
                  <ShieldAlert size={16} /> {t('Suspender 72 h')}
                </button>
                <button
                  className="button secondary"
                  disabled={working || loading || reason.trim().length < 3}
                  onClick={() => updateUser('active')}
                >
                  <UserRound size={16} /> {t('Restaurar')}
                </button>
              </div>
              <h3>{t('Historial de decisiones')}</h3>
              <AuditList items={selected.audit} />
            </>
          ) : (
            <p className="moderation-muted">
              {t('Selecciona una denuncia para revisar sus detalles.')}
            </p>
          )}
        </div>
      </section>
      <section className="moderation-card moderation-history">
        <h2>{t('Actividad reciente')}</h2>
        <AuditList items={audit} />
      </section>
    </main>
  );
}

function AuditList({ items }) {
  return items?.length ? (
    <ul className="moderation-audit">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <b>{item.actor?.name || t('Operador')}</b> · {item.action}
          </div>
          <span>
            {item.fromStatus || '—'} → {item.toStatus || '—'} · {item.reason}
          </span>
          <time>{date(item.createdAt)}</time>
        </li>
      ))}
    </ul>
  ) : (
    <p className="moderation-muted">{t('Todavía no hay decisiones registradas.')}</p>
  );
}

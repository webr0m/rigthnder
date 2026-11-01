export function formatPlanDate(value, locale) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value || '');
  const date = new Date(dateOnly ? value + 'T12:00:00' : value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit' }),
  });
}

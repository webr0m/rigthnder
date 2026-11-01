// Shared by the registration form and both email/Google registration endpoints.
// The age gate follows the civil calendar in the service's primary market.
function currentCivilDate(now) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return Object.fromEntries(
    parts
      .filter(({ type }) => ['year', 'month', 'day'].includes(type))
      .map(({ type, value }) => [type, Number(value)]),
  );
}

export function ageOf(birthdate, now = new Date()) {
  const { year, month, day } = currentCivilDate(now);
  const [birthYear, birthMonth, birthDay] = birthdate.split('-').map(Number);
  return (
    year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0)
  );
}

export function birthdateError(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Escribe tu fecha de nacimiento completa.';
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    return 'Escribe una fecha de nacimiento válida.';
  const age = ageOf(value, now);
  if (age < 18) return 'Debes tener al menos 18 años.';
  if (age > 100) return 'Revisa tu año de nacimiento. Debes tener entre 18 y 100 años.';
  return '';
}

export function birthdateBounds(now = new Date()) {
  const { year, month: monthNumber, day } = currentCivilDate(now);
  const month = monthNumber - 1;
  // Date normalizes leap days; clamp the maximum to the last day of February.
  const max = new Date(
    Date.UTC(
      year - 18,
      month,
      Math.min(day, new Date(Date.UTC(year - 18, month + 1, 0)).getUTCDate()),
    ),
  );
  const min = new Date(
    Date.UTC(
      year - 101,
      month,
      Math.min(day, new Date(Date.UTC(year - 101, month + 1, 0)).getUTCDate()) + 1,
    ),
  );
  return { min: min.toISOString().slice(0, 10), max: max.toISOString().slice(0, 10) };
}

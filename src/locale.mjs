import messages from './translations.json' with { type: 'json' };

export const LANGUAGES = [
  ['es', 'Español'],
  ['en', 'English'],
  ['de', 'Deutsch'],
];
const listeners = new Set();
let language = 'es';
try {
  const saved = localStorage.getItem('onlyfachos-language');
  if (LANGUAGES.some(([code]) => code === saved)) language = saved;
} catch {}
export const getLanguage = () => language;
export function translateCommon(value) {
  for (const prefix of ['Ve ', 'Lee a ', 'Sigue a ', 'Escucha ', 'Hijos: '])
    if (value.startsWith(prefix)) return t(prefix) + value.slice(prefix.length);
  return t(value);
}
export function setLanguage(value) {
  if (!LANGUAGES.some(([code]) => code === value)) return;
  language = value;
  try {
    localStorage.setItem('onlyfachos-language', value);
  } catch {}
  if (typeof document !== 'undefined') document.documentElement.lang = value;
  listeners.forEach((listener) => listener());
}
export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function t(source, locale = language) {
  if (typeof source !== 'string' || locale === 'es') return source;
  const key = source.replace(/\s+/g, ' ').trim();
  const text = messages[key.toLocaleLowerCase('es')]?.[locale];
  if (!text) return source;
  const result =
    key === key.toUpperCase() && key !== key.toLowerCase() ? text.toLocaleUpperCase(locale) : text;
  return (source.match(/^\s*/)?.[0] || '') + result + (source.match(/\s*$/)?.[0] || '');
}

import React, { useSyncExternalStore } from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES, getLanguage, setLanguage, subscribeLanguage, t } from './locale.mjs';

export const useLanguage = () => useSyncExternalStore(subscribeLanguage, getLanguage, () => 'es');
export default function LanguagePicker({ onChange }) {
  const language = useLanguage();
  return (
    <label className="language-picker">
      <Languages size={18} aria-hidden="true" />
      <span className="sr-only">{t('Idioma de la app')}</span>
      <select
        aria-label={t('Idioma de la app')}
        value={language}
        onChange={(e) => {
          setLanguage(e.target.value);
          onChange?.(e.target.value);
        }}
      >
        {LANGUAGES.map(([code, label]) => (
          <option key={code} value={code} lang={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

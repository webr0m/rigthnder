import { t, getLanguage } from './locale.mjs';
import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Camera, Check, LoaderCircle } from 'lucide-react';
import { Button } from './Shared';
import { birthdateError, birthdateBounds } from '../server/birthdate.mjs';

export async function compressPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error(t('Elige una foto JPG, PNG o WebP.'));
  if (file.size > 12_000_000) throw Error(t('La foto original debe pesar menos de 12 MB.'));
  if (!file.size) throw Error(t('La foto está vacía. Elige otra imagen.'));
  try {
    // img-src already permits data: in production. blob: previews were blocked by CSP.
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reader.onabort = () => reject(Error('No se pudo leer la foto.'));
      reader.readAsDataURL(file);
    });
    const image = new Image();
    image.src = source;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw Error('Imagen sin dimensiones.');
    const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } catch {
    throw Error(
      t(
        'No pudimos abrir esta foto. Puede estar dañada o tener un formato distinto. Prueba con otra JPG, PNG o WebP.',
      ),
    );
  }
}
export function Chips({ label, choices, value, onChange, multiple = false }) {
  return (
    <fieldset className="choice-group">
      <legend>{t(label)}</legend>
      <div className="chips">
        {choices.map((v) => (
          <button
            type="button"
            key={v}
            aria-pressed={multiple ? value.includes(v) : value === v}
            className={(multiple ? value.includes(v) : value === v) ? 'selected' : ''}
            onClick={() =>
              onChange(
                multiple
                  ? value.includes(v)
                    ? value.filter((s) => s !== v)
                    : [...value, v]
                  : value === v
                    ? ''
                    : v,
              )
            }
          >
            {t(v)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function Tags({ label, suggestions, value, onChange }) {
  const [search, setSearch] = useState('');
  function add(v) {
    const text = v.trim().slice(0, 60);
    if (
      text &&
      value.length < 12 &&
      !value.some((item) => item.toLocaleLowerCase() === text.toLocaleLowerCase())
    )
      onChange([...value, text]);
    setSearch('');
  }
  return (
    <div className="tag-field">
      <h4>{t(label)}</h4>
      <input
        aria-label={t(label)}
        value={search}
        maxLength={60}
        enterKeyHint="done"
        placeholder={t('Busca o añade el tuyo…')}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.nativeEvent.isComposing) return;
            add(search);
          }
        }}
      />
      <div className="chips picked">
        {value.map((v) => (
          <button
            type="button"
            className="selected"
            key={v}
            onClick={() => onChange(value.filter((s) => s !== v))}
          >
            {v}
            <X size={12} />
          </button>
        ))}
      </div>
      <div className="chips suggestions">
        {suggestions
          .filter((v) => !value.includes(v) && v.toLowerCase().includes(search.toLowerCase()))
          .map((v) => (
            <button type="button" key={v} onClick={() => add(v)}>
              + {v}
            </button>
          ))}
        {search.trim() && !value.includes(search.trim()) && (
          <button type="button" onClick={() => add(search)}>
            {t('+ Añadir «')}
            {search}»
          </button>
        )}
      </div>
    </div>
  );
}
const empty = {
  photos: [],
  region: '',
  nationalities: [''],
  workMode: '',
  streamers: [],
  creators: [],
  authors: [],
  artists: [],
  debate: '',
  partyStance: '',
  party: '',
  years: '',
  current: '',
  faith: '',
  denomination: '',
  children: '',
  languages: [{ language: 'Español', level: 'Nativo' }],
  countries: [],
  countryCount: 0,
  sensitiveConsent: false,
};
export default function Onboarding({ user, identity, onSave, onCancel, busy, initialStep = 1 }) {
  const [step, setStep] = useState(initialStep),
    [error, setError] = useState(''),
    [birthError, setBirthError] = useState(''),
    [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState(() => ({
    name: user?.name || identity?.name || '',
    birthdate: user?.birthdate || '',
    gender: ['hombre', 'mujer'].includes(user?.gender) ? user.gender : '',
    city: user?.city || '',
    occupation: user?.occupation || '',
    bio: user?.bio?.slice(0, 200) || '',
    lookingFor: user?.lookingFor || 'todos',
  }));
  const [c, setC] = useState(() => ({
    ...empty,
    ...user?.community,
    nationalities: user?.community?.nationalities?.length ? user.community.nationalities : [''],
    photos: user?.community?.photos?.length
      ? user.community.photos
      : user?.photo
        ? [user.photo]
        : [],
  }));
  const [terms, setTerms] = useState(!!user),
    [consent, setConsent] = useState(!!user);
  const abroad = c.region === 'Fuera de Chile';
  const update = (key, value) => setC((v) => ({ ...v, [key]: value }));
  const field = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
  async function upload(e) {
    const input = e.target;
    setUploading(true);
    setError('');
    try {
      const files = [...input.files].slice(0, 6 - c.photos.length);
      const photos = [],
        errors = [];
      // Decode one at a time to avoid holding several full-size photos in memory on phones.
      for (const file of files) {
        try {
          photos.push(await compressPhoto(file));
        } catch (error) {
          errors.push(`«${file.name.slice(0, 100)}»: ${error.message}`);
        }
      }
      if (photos.length)
        setC((current) => ({ ...current, photos: [...current.photos, ...photos].slice(0, 6) }));
      if (errors.length) setError(errors.join(' '));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      input.value = '';
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!['hombre', 'mujer'].includes(draft.gender)) {
      setStep(1);
      return setError('Elige Hombre o Mujer en Sexo.');
    }
    if (step === 1) {
      const birthError = birthdateError(draft.birthdate);
      setBirthError(birthError);
      if (birthError) {
        document.getElementById('birthdate')?.focus();
        return;
      }
      if (c.photos.length < 2)
        return setError('Añade al menos dos fotos propias antes de continuar.');
    }
    if (step < 3) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    if (!terms || !consent) return setError('Confirma las condiciones del perfil para continuar.');
    try {
      await onSave({
        ...draft,
        community: { ...c, nationalities: c.nationalities.filter(Boolean) },
        terms,
        valuesConsent: consent,
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <form className="wizard form" onSubmit={submit}>
      <div className="wizard-progress">
        <button
          type="button"
          className="icon-button"
          aria-label={step === 1 ? t('Cancelar registro') : t('Volver al paso anterior')}
          onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= step ? 'done' : ''} />
          ))}
        </div>
        <small>{step}/3</small>
      </div>
      <div className="wizard-title">
        <span className="label-strip">
          {t('PASO ')}
          {step} · {t(['LO BÁSICO', 'TU FEED', 'SIN FILTRO'][step - 1])}
        </span>
        <h1>{t(['ARMA TU PERFIL', '¿QUÉ CONSUMES?', 'TU LADO DEL ESPECTRO'][step - 1])}</h1>
        <p>
          {t(
            [
              'Fotos reales y una bio que no dé sueño.',
              'Así te encuentra la gente que ve y lee lo mismo que tú.',
              'Lo que importa antes del primer café. Comparte solo lo que quieras.',
            ][step - 1],
          )}
        </p>
      </div>
      {step === 1 && (
        <>
          <div>
            <h4>
              {t('FOTOS · MÍNIMO 2 ')}
              <span>{c.photos.length}/6</span>
            </h4>
            <div className="photo-slots">
              {c.photos.map((photo, i) => (
                <div key={i} className="photo-slot">
                  <img src={photo} alt={t('Tu foto ') + (i + 1)} />
                  <button
                    type="button"
                    className="remove-photo"
                    aria-label={t('Quitar foto ') + (i + 1)}
                    onClick={() =>
                      update(
                        'photos',
                        c.photos.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <X size={14} />
                  </button>
                  {i === 0 ? (
                    <small>{t('PRINCIPAL')}</small>
                  ) : (
                    <button
                      type="button"
                      className="make-primary"
                      onClick={() =>
                        update('photos', [photo, ...c.photos.filter((_, n) => n !== i)])
                      }
                    >
                      {t('Hacer principal')}
                    </button>
                  )}
                </div>
              ))}
              {c.photos.length < 6 && (
                <label className="photo-add">
                  <Plus size={24} />
                  <span>{uploading ? t('Preparando…') : t('Añadir fotos')}</span>
                  <input
                    type="file"
                    aria-label={t('Añadir fotos')}
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={upload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="hint">{t('Solo fotos tuyas. La primera será tu foto principal.')}</p>
            {user?.demo && (
              <button
                type="button"
                className="text-link"
                onClick={() => update('photos', ['/photos/lucia.jpg', '/photos/coast.jpg'])}
              >
                {t('Usar fotos de muestra (solo demo)')}
              </button>
            )}
          </div>
          <label>
            {t('Nombre')}
            <input
              required
              minLength={2}
              maxLength={40}
              value={draft.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder={t('¿Cómo te llamas?')}
              autoComplete="given-name"
            />
          </label>
          <label>
            {t('Fecha de nacimiento')}
            <input
              id="birthdate"
              type="date"
              required
              value={draft.birthdate}
              disabled={!!user}
              onChange={(e) => {
                field('birthdate', e.target.value);
                if (birthError) setBirthError(birthdateError(e.target.value));
              }}
              onBlur={(e) => {
                field('birthdate', e.target.value);
                setBirthError(birthdateError(e.target.value));
              }}
              onInvalid={(e) => {
                e.preventDefault();
                setBirthError(birthdateError(e.target.value));
                e.target.focus();
              }}
              {...birthdateBounds()}
              aria-invalid={!!birthError}
              aria-describedby={birthError ? 'birthdate-error' : 'birthdate-hint'}
            />
            <small id="birthdate-hint" className="hint">
              {t('Se muestra tu edad, nunca tu fecha de nacimiento.')}
            </small>
            {birthError && (
              <small id="birthdate-error" className="field-error" role="alert">
                {t(birthError)}
              </small>
            )}
          </label>
          <label>
            {t('¿Dónde vives?')}
            <select
              value={abroad ? 'abroad' : 'chile'}
              onChange={(e) =>
                update('region', e.target.value === 'abroad' ? 'Fuera de Chile' : '')
              }
            >
              <option value="chile">{t('En Chile')}</option>
              <option value="abroad">{t('En el extranjero')}</option>
            </select>
          </label>
          <div className={abroad ? 'residence-city' : 'form-row'}>
            {!abroad && (
              <label>
                {t('Región')}
                <select value={c.region} onChange={(e) => update('region', e.target.value)}>
                  <option value="">{t('Seleccionar')}</option>
                  {[
                    'Arica y Parinacota',
                    'Tarapacá',
                    'Antofagasta',
                    'Atacama',
                    'Coquimbo',
                    'Valparaíso',
                    'Metropolitana',
                    'O’Higgins',
                    'Maule',
                    'Ñuble',
                    'Biobío',
                    'La Araucanía',
                    'Los Ríos',
                    'Los Lagos',
                    'Aysén',
                    'Magallanes',
                  ].map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {t('Ciudad')}
              <input
                required
                minLength={2}
                maxLength={60}
                value={draft.city}
                onChange={(e) => field('city', e.target.value)}
                placeholder={abroad ? t('Ej.: Madrid, Buenos Aires, Berlín…') : t('Tu ciudad')}
                autoComplete="address-level2"
              />
              {abroad && (
                <small className="hint">
                  {t('Escribe la ciudad donde vives, en cualquier país.')}
                </small>
              )}
            </label>
          </div>
          {c.nationalities.map((v, i) => (
            <label key={i}>
              {i ? t('Segunda nacionalidad') : t('Nacionalidad (opcional)')}
              <input
                value={v}
                maxLength={60}
                onChange={(e) =>
                  update(
                    'nationalities',
                    c.nationalities.map((n, j) => (j === i ? e.target.value : n)),
                  )
                }
              />
            </label>
          ))}
          <button
            type="button"
            className="text-link"
            onClick={() =>
              update(
                'nationalities',
                c.nationalities.length === 1
                  ? [...c.nationalities, '']
                  : c.nationalities.slice(0, 1),
              )
            }
          >
            {c.nationalities.length === 1
              ? t('+ Tengo doble nacionalidad')
              : t('Quitar segunda nacionalidad')}
          </button>
          <div className="form-row">
            <label>
              {t('Sexo')}
              <select
                required
                value={draft.gender}
                onChange={(e) => field('gender', e.target.value)}
              >
                <option value="" disabled>
                  {t('Elige una opción')}
                </option>
                <option value="mujer">{t('Mujer')}</option>
                <option value="hombre">{t('Hombre')}</option>
              </select>
            </label>
            <label>
              {t('Quiero conocer')}
              <select
                value={draft.lookingFor}
                onChange={(e) => field('lookingFor', e.target.value)}
              >
                <option value="todos">{t('Todas las personas')}</option>
                <option value="mujer">{t('Mujeres')}</option>
                <option value="hombre">{t('Hombres')}</option>
              </select>
            </label>
          </div>
          <Chips
            label={t('¿ESTUDIAS O TRABAJAS?')}
            choices={['Trabajo', 'Estudio', 'Ambos', 'Emprendo']}
            value={c.workMode}
            onChange={(v) => update('workMode', v)}
          />
          <label>
            {t('Qué haces y dónde')}
            <input
              maxLength={80}
              value={draft.occupation}
              onChange={(e) => field('occupation', e.target.value)}
              placeholder={t('Lo que haces, en tus palabras')}
            />
          </label>
          <label>
            {t('Bio ')}
            <span className="character-count">{draft.bio.length}/200</span>
            <textarea
              maxLength={200}
              rows={3}
              value={draft.bio}
              onChange={(e) => field('bio', e.target.value)}
              placeholder={t(
                'Algo que te defina en dos líneas. Prohibido poner ‘me gusta viajar’.',
              )}
            />
          </label>
        </>
      )}
      {step === 2 && (
        <>
          <label>
            {t('Hablemos de')}
            <textarea
              value={c.debate || ''}
              maxLength={180}
              placeholder={t('Una idea para romper el hielo…')}
              onChange={(e) => update('debate', e.target.value)}
            />
          </label>
          <Tags
            label={t('ARTISTAS Y CANTANTES')}
            suggestions={['Rammstein', 'Juan Luis Guerra', 'Raphael', 'Los Jaivas']}
            value={c.artists || []}
            onChange={(v) => update('artists', v)}
          />
          <Tags
            label={t('STREAMERS QUE VES')}
            suggestions={[
              'La Cofradía',
              'Mises TV',
              'La Cofrarneta',
              'Agricultura',
              'Ingobernables',
            ]}
            value={c.streamers}
            onChange={(v) => update('streamers', v)}
          />
          <Tags
            label={t('INFLUENCERS')}
            suggestions={[]}
            value={c.creators}
            onChange={(v) => update('creators', v)}
          />
          <Tags
            label={t('ESCRITORES Y PENSADORES')}
            suggestions={[
              'Thomas Sowell',
              'Hayek',
              'Chesterton',
              'Axel Kaiser',
              'Agustín Laje',
              'Nicolás Márquez',
              'Mises',
              'Edmund Burke',
              'Ayn Rand',
              'C. S. Lewis',
            ]}
            value={c.authors}
            onChange={(v) => update('authors', v)}
          />
          <Chips
            label={t('¿PERTENECES O SIMPATIZAS CON ALGÚN PARTIDO?')}
            choices={['Milito', 'Simpatizo', 'Ninguno']}
            value={c.partyStance}
            onChange={(v) => update('partyStance', v)}
          />
          {['Milito', 'Simpatizo'].includes(c.partyStance) && (
            <>
              <Chips
                label={t('¿CON CUÁL?')}
                choices={['PNL', 'Republicanos', 'Evópoli', 'RN', 'Chile Vamos']}
                value={c.party}
                onChange={(v) => update('party', v)}
              />
              <label>
                {t('Otro partido (opcional)')}
                <input
                  maxLength={60}
                  value={c.party}
                  onChange={(e) => update('party', e.target.value)}
                />
              </label>
            </>
          )}
          <p className="hint">
            {t('Todos estos campos son opcionales. Puedes dejarlos vacíos o cambiarlos después.')}
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <Chips
            label={t('¿HACE CUÁNTO ERES DE DERECHA?')}
            choices={[
              'Desde siempre',
              '+10 años',
              '5 a 10 años',
              '1 a 5 años',
              'Recién despertando',
            ]}
            value={c.years}
            onChange={(v) => update('years', v)}
          />
          <Chips
            label={t('CORRIENTE')}
            choices={[
              'Conservador',
              'Libertario',
              'Liberal clásico',
              'Anarcocapitalista',
              'Patriota',
              'Minarquista',
              'Gremialista',
              'Indeciso',
            ]}
            value={c.current}
            onChange={(v) => update('current', v)}
          />
          <Chips
            label={t('¿ERES CREYENTE?')}
            choices={['Sí', 'No', 'En búsqueda']}
            value={c.faith}
            onChange={(v) => update('faith', v)}
          />
          {c.faith === 'Sí' && (
            <Chips
              label={t('¿CUÁL? (OPCIONAL)')}
              choices={[
                'Católica',
                'Evangélica',
                'No denominational',
                'Protestante',
                'Ortodoxa',
                'Bautista',
                'Pentecostal',
                'Anglicana',
                'Mormona',
                'Judía',
                'Otra',
              ]}
              value={c.denomination}
              onChange={(v) => update('denomination', v)}
            />
          )}
          <Chips
            label={t('¿QUIERES TENER HIJOS?')}
            choices={['Sí', 'Ya tengo', 'Algún día', 'No']}
            value={c.children}
            onChange={(v) => update('children', v)}
          />
          <div>
            <h4>{t('IDIOMAS')}</h4>
            {c.languages.map((l, i) => (
              <div className="language-row" key={i}>
                <input
                  aria-label={t('Idioma ') + (i + 1)}
                  maxLength={60}
                  value={l.language}
                  onChange={(e) =>
                    update(
                      'languages',
                      c.languages.map((v, j) => (i === j ? { ...v, language: e.target.value } : v)),
                    )
                  }
                />
                <select
                  aria-label={t('Nivel del idioma ') + (i + 1)}
                  value={l.level}
                  onChange={(e) =>
                    update(
                      'languages',
                      c.languages.map((v, j) => (i === j ? { ...v, level: e.target.value } : v)),
                    )
                  }
                >
                  {['Nativo', 'Avanzado', 'Intermedio', 'Básico'].map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t('Quitar idioma ') + (i + 1)}
                  onClick={() =>
                    update(
                      'languages',
                      c.languages.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            {c.languages.length < 8 && (
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  update('languages', [...c.languages, { language: '', level: 'Básico' }])
                }
              >
                {t('+ Agregar idioma')}
              </button>
            )}
          </div>
          <div className="travel-box">
            <h4>{t('¿HAS VIAJADO?')}</h4>
            <div className="counter">
              <span>{t('Países que conoces')}</span>
              <button
                type="button"
                aria-label={t('Menos países')}
                onClick={() => update('countryCount', Math.max(0, c.countryCount - 1))}
              >
                −
              </button>
              <strong>{c.countryCount}</strong>
              <button
                type="button"
                aria-label={t('Más países')}
                onClick={() => update('countryCount', Math.min(195, c.countryCount + 1))}
              >
                +
              </button>
            </div>
            <Tags
              label={t('PAÍSES (OPCIONAL)')}
              suggestions={['Argentina', 'España', 'Alemania', 'Estados Unidos']}
              value={c.countries}
              onChange={(v) =>
                setC((p) => ({
                  ...p,
                  countries: v,
                  countryCount: Math.max(p.countryCount, v.length),
                }))
              }
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={c.sensitiveConsent}
              onChange={(e) =>
                setC((p) =>
                  e.target.checked
                    ? { ...p, sensitiveConsent: true }
                    : {
                        ...p,
                        sensitiveConsent: false,
                        streamers: [],
                        authors: [],
                        artists: [],
                        debate: '',
                        creators: [],
                        years: '',
                        current: '',
                        faith: '',
                        denomination: '',
                        partyStance: '',
                        party: '',
                      },
                )
              }
            />
            <span>
              {t(
                'Quiero mostrar los datos de política y religión que elegí y usarlos para encontrar coincidencias. Al desmarcar, se eliminan los referentes y los datos de política y religión de este formulario. No se envían a anunciantes.',
              )}
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>
              {t('Tengo 18 años o más y acepto los')}{' '}
              <a href="/terminos" target="_blank" rel="noreferrer">
                {t('términos de comunidad')}
              </a>
              .
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              {t('Acepto publicar los datos de mi perfil y usarlos para sugerir conexiones.')}{' '}
              <a href="/privacidad" target="_blank" rel="noreferrer">
                {t('Ver privacidad')}
              </a>
              .
            </span>
          </label>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="wizard-footer">
        <Button disabled={busy || uploading}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : step < 3 ? (
            t('SIGUIENTE')
          ) : user ? (
            t('GUARDAR MI PERFIL')
          ) : (
            t('ENTRAR A LA COMUNIDAD')
          )}
        </Button>
      </div>
    </form>
  );
}

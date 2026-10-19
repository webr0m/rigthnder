import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Camera, Check, LoaderCircle } from 'lucide-react';
import { Button } from './Shared';

export async function compressPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error('Elige una foto JPG, PNG o WebP.');
  if (file.size > 12_000_000) throw Error('La foto original debe pesar menos de 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 720 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function Chips({ label, choices, value, onChange, multiple = false }) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
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
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function Tags({ label, suggestions, value, onChange }) {
  const [search, setSearch] = useState('');
  function add(v) {
    if (v.trim() && value.length < 12) onChange([...new Set([...value, v.trim().slice(0, 60)])]);
    setSearch('');
  }
  return (
    <div className="tag-field">
      <h4>{label}</h4>
      <input
        aria-label={label}
        value={search}
        maxLength={60}
        placeholder="Busca o añade el tuyo…"
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
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
            + Añadir «{search}»
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
export default function Onboarding({ user, identity, onSave, onCancel, busy }) {
  const [step, setStep] = useState(1),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState(() => ({
    name: user?.name || identity?.name || '',
    birthdate: user?.birthdate || '',
    gender: user?.gender || 'otro',
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
    setUploading(true);
    setError('');
    try {
      const files = [...e.target.files].slice(0, 6 - c.photos.length);
      const photos = await Promise.all(files.map(compressPhoto));
      update('photos', [...c.photos, ...photos]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (step === 1) {
      if (c.photos.length < 2)
        return setError('Añade al menos dos fotos propias antes de continuar.');
      const age = new Date(),
        birth = new Date(draft.birthdate + 'T00:00:00');
      age.setFullYear(age.getFullYear() - 18);
      if (!draft.birthdate || birth > age) return setError('Debes tener al menos 18 años.');
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
          aria-label={step === 1 ? 'Cancelar registro' : 'Volver al paso anterior'}
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
          PASO {step} · {['LO BÁSICO', 'TU FEED', 'SIN FILTRO'][step - 1]}
        </span>
        <h1>{['ARMA TU PERFIL', '¿QUÉ CONSUMES?', 'TU LADO DEL ESPECTRO'][step - 1]}</h1>
        <p>
          {
            [
              'Fotos reales y una bio que no dé sueño.',
              'Así te encuentra la gente que ve y lee lo mismo que tú.',
              'Lo que importa antes del primer café. Comparte solo lo que quieras.',
            ][step - 1]
          }
        </p>
      </div>
      {step === 1 && (
        <>
          <div>
            <h4>
              FOTOS · MÍNIMO 2 <span>{c.photos.length}/6</span>
            </h4>
            <div className="photo-slots">
              {c.photos.map((photo, i) => (
                <div key={i} className="photo-slot">
                  <img src={photo} alt={'Tu foto ' + (i + 1)} />
                  <button
                    type="button"
                    className="remove-photo"
                    aria-label={'Quitar foto ' + (i + 1)}
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
                    <small>PRINCIPAL</small>
                  ) : (
                    <button
                      type="button"
                      className="make-primary"
                      onClick={() =>
                        update('photos', [photo, ...c.photos.filter((_, n) => n !== i)])
                      }
                    >
                      Hacer principal
                    </button>
                  )}
                </div>
              ))}
              {c.photos.length < 6 && (
                <label className="photo-add">
                  <Plus size={24} />
                  <span>{uploading ? 'Preparando…' : 'Añadir fotos'}</span>
                  <input
                    type="file"
                    aria-label="Añadir fotos"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={upload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="hint">Solo fotos tuyas. La primera será tu foto principal.</p>
            {user?.demo && (
              <button
                type="button"
                className="text-link"
                onClick={() => update('photos', ['/photos/lucia.jpg', '/photos/coast.jpg'])}
              >
                Usar fotos de muestra (solo demo)
              </button>
            )}
          </div>
          <label>
            Nombre
            <input
              required
              minLength={2}
              maxLength={40}
              value={draft.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder="¿Cómo te llamas?"
              autoComplete="given-name"
            />
          </label>
          <label>
            Fecha de nacimiento
            <input
              type="date"
              required
              value={draft.birthdate}
              disabled={!!user}
              onChange={(e) => field('birthdate', e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                .toISOString()
                .slice(0, 10)}
            />
            <small className="hint">Se muestra tu edad, nunca tu fecha de nacimiento.</small>
          </label>
          <label>
            ¿Dónde vives?
            <select
              value={abroad ? 'abroad' : 'chile'}
              onChange={(e) =>
                update('region', e.target.value === 'abroad' ? 'Fuera de Chile' : '')
              }
            >
              <option value="chile">En Chile</option>
              <option value="abroad">En el extranjero</option>
            </select>
          </label>
          <div className={abroad ? 'residence-city' : 'form-row'}>
            {!abroad && (
              <label>
                Región
                <select value={c.region} onChange={(e) => update('region', e.target.value)}>
                  <option value="">Seleccionar</option>
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
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Ciudad
              <input
                required
                minLength={2}
                maxLength={60}
                value={draft.city}
                onChange={(e) => field('city', e.target.value)}
                placeholder={abroad ? 'Ej.: Madrid, Buenos Aires, Berlín…' : 'Tu ciudad'}
                autoComplete="address-level2"
              />
              {abroad && (
                <small className="hint">Escribe la ciudad donde vives, en cualquier país.</small>
              )}
            </label>
          </div>
          {c.nationalities.map((v, i) => (
            <label key={i}>
              {i ? 'Segunda nacionalidad' : 'Nacionalidad (opcional)'}
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
              ? '+ Tengo doble nacionalidad'
              : 'Quitar segunda nacionalidad'}
          </button>
          <div className="form-row">
            <label>
              Sexo
              <select value={draft.gender} onChange={(e) => field('gender', e.target.value)}>
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label>
              Quiero conocer
              <select
                value={draft.lookingFor}
                onChange={(e) => field('lookingFor', e.target.value)}
              >
                <option value="todos">Todas las personas</option>
                <option value="mujer">Mujeres</option>
                <option value="hombre">Hombres</option>
                <option value="otro">Otras identidades</option>
              </select>
            </label>
          </div>
          <Chips
            label="¿ESTUDIAS O TRABAJAS?"
            choices={['Trabajo', 'Estudio', 'Ambos', 'Emprendo']}
            value={c.workMode}
            onChange={(v) => update('workMode', v)}
          />
          <label>
            Qué haces y dónde
            <input
              maxLength={80}
              value={draft.occupation}
              onChange={(e) => field('occupation', e.target.value)}
              placeholder="Lo que haces, en tus palabras"
            />
          </label>
          <label>
            Bio <span className="character-count">{draft.bio.length}/200</span>
            <textarea
              maxLength={200}
              rows={3}
              value={draft.bio}
              onChange={(e) => field('bio', e.target.value)}
              placeholder="Algo que te defina en dos líneas. Prohibido poner ‘me gusta viajar’."
            />
          </label>
        </>
      )}
      {step === 2 && (
        <>
          <Tags
            label="STREAMERS QUE VES"
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
            label="INFLUENCERS"
            suggestions={[]}
            value={c.creators}
            onChange={(v) => update('creators', v)}
          />
          <Tags
            label="ESCRITORES Y PENSADORES"
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
            label="¿PERTENECES O SIMPATIZAS CON ALGÚN PARTIDO?"
            choices={['Milito', 'Simpatizo', 'Ninguno']}
            value={c.partyStance}
            onChange={(v) => update('partyStance', v)}
          />
          {['Milito', 'Simpatizo'].includes(c.partyStance) && (
            <>
              <Chips
                label="¿CON CUÁL?"
                choices={['PNL', 'Republicanos', 'Evópoli', 'RN', 'Chile Vamos']}
                value={c.party}
                onChange={(v) => update('party', v)}
              />
              <label>
                Otro partido (opcional)
                <input
                  maxLength={60}
                  value={c.party}
                  onChange={(e) => update('party', e.target.value)}
                />
              </label>
            </>
          )}
          <p className="hint">
            Todos estos campos son opcionales. Puedes dejarlos vacíos o cambiarlos después.
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <Chips
            label="¿HACE CUÁNTO ERES DE DERECHA?"
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
            label="CORRIENTE"
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
            label="¿ERES CREYENTE?"
            choices={['Sí', 'No', 'En búsqueda']}
            value={c.faith}
            onChange={(v) => update('faith', v)}
          />
          {c.faith === 'Sí' && (
            <Chips
              label="¿CUÁL? (OPCIONAL)"
              choices={[
                'Católica',
                'Evangélica',
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
            label="¿QUIERES TENER HIJOS?"
            choices={['Sí', 'Ya tengo', 'Algún día', 'No']}
            value={c.children}
            onChange={(v) => update('children', v)}
          />
          <div>
            <h4>IDIOMAS</h4>
            {c.languages.map((l, i) => (
              <div className="language-row" key={i}>
                <input
                  aria-label={'Idioma ' + (i + 1)}
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
                  aria-label={'Nivel del idioma ' + (i + 1)}
                  value={l.level}
                  onChange={(e) =>
                    update(
                      'languages',
                      c.languages.map((v, j) => (i === j ? { ...v, level: e.target.value } : v)),
                    )
                  }
                >
                  {['Nativo', 'Avanzado', 'Intermedio', 'Básico'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={'Quitar idioma ' + (i + 1)}
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
                + Agregar idioma
              </button>
            )}
          </div>
          <div className="travel-box">
            <h4>¿HAS VIAJADO?</h4>
            <div className="counter">
              <span>Países que conoces</span>
              <button
                type="button"
                aria-label="Menos países"
                onClick={() => update('countryCount', Math.max(0, c.countryCount - 1))}
              >
                −
              </button>
              <strong>{c.countryCount}</strong>
              <button
                type="button"
                aria-label="Más países"
                onClick={() => update('countryCount', Math.min(195, c.countryCount + 1))}
              >
                +
              </button>
            </div>
            <Tags
              label="PAÍSES (OPCIONAL)"
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
              Quiero mostrar los datos de política y religión que elegí y usarlos para encontrar
              coincidencias. Al desmarcar, se eliminan los referentes y los datos de política y
              religión de este formulario. No se envían a anunciantes.
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
              Tengo 18 años o más y acepto los{' '}
              <a href="/terminos" target="_blank" rel="noreferrer">
                términos de comunidad
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
              Acepto publicar los datos de mi perfil y usarlos para sugerir conexiones.{' '}
              <a href="/privacidad" target="_blank" rel="noreferrer">
                Ver privacidad
              </a>
              .
            </span>
          </label>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="wizard-footer">
        <Button disabled={busy || uploading}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : step < 3 ? (
            'SIGUIENTE'
          ) : user ? (
            'GUARDAR MI PERFIL'
          ) : (
            'ENTRAR A LA COMUNIDAD'
          )}
        </Button>
      </div>
    </form>
  );
}

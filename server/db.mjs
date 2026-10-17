import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const VALUES = [
  'Libertad',
  'Familia',
  'Tradición',
  'Emprendimiento',
  'Responsabilidad',
  'Patria',
];
export const INTERESTS = [
  'Café',
  'Viajes',
  'Trekking',
  'Libros',
  'Música',
  'Deporte',
  'Cocina',
  'Perros',
  'Vino',
  'Arte',
];
export const DEMO_PROFILES = [
  {
    id: 'demo_lucia',
    name: 'Lucía',
    birthdate: '1999-04-12',
    gender: 'mujer',
    city: 'Santiago',
    occupation: 'Arquitecta & amante del café',
    photo: '/photos/lucia.jpg',
    bio: 'De las que creen en la libertad, los domingos en familia y que un buen café puede arreglar casi todo. Si me haces reír, ya tienes mi voto.',
    values: ['Libertad', 'Familia', 'Emprendimiento'],
    interests: ['Café', 'Viajes', 'Trekking', 'Perros'],
    prompt: 'Mi primera cita ideal sería…',
    answer: 'Un café sin prisa, una caminata y una conversación que nos haga olvidar el celular.',
    intention: 'Una relación',
    lookingFor: 'todos',
  },
  {
    id: 'demo_martin',
    name: 'Martín',
    birthdate: '1996-08-15',
    gender: 'hombre',
    city: 'Santiago',
    occupation: 'Emprendedor & cocinero de domingo',
    photo: '/photos/martin.jpg',
    bio: 'Construyendo mi propio camino. Me gustan los proyectos con propósito y las personas que dicen lo que piensan. Hago una pasta bastante buena.',
    values: ['Libertad', 'Emprendimiento', 'Responsabilidad'],
    interests: ['Cocina', 'Deporte', 'Viajes'],
    prompt: 'Una pequeña cosa que me hace feliz…',
    answer: 'Cocinar para alguien y que quiera repetir.',
    intention: 'Una relación',
    lookingFor: 'todos',
  },
  {
    id: 'demo_valentina',
    name: 'Valentina',
    birthdate: '1998-01-23',
    gender: 'mujer',
    city: 'Santiago',
    occupation: 'Diseñadora & exploradora',
    photo: '/photos/valentina.jpg',
    bio: 'Creo en las ideas propias, el esfuerzo y los planes que empiezan con “¿y si vamos?”. Tengo más libros que espacio para guardarlos.',
    values: ['Familia', 'Tradición', 'Libertad'],
    interests: ['Libros', 'Arte', 'Café'],
    prompt: 'Podría hablar durante horas de…',
    answer: 'Diseño, libros subrayados y ese próximo viaje que todavía no planeamos.',
    intention: 'Conocer personas',
    lookingFor: 'todos',
  },
  {
    id: 'demo_tomas',
    name: 'Tomás',
    birthdate: '1997-05-03',
    gender: 'hombre',
    city: 'Viña del Mar',
    occupation: 'Ingeniero & fan del mar',
    photo: '/photos/tomas.jpg',
    bio: 'De ideas claras y planes simples. Playa, una buena playlist y alguien con quien construir algo bonito.',
    values: ['Familia', 'Patria', 'Responsabilidad'],
    interests: ['Música', 'Deporte', 'Perros'],
    prompt: 'Mi plan de fin de semana…',
    answer: 'Escaparnos a la costa y ver dónde termina el camino.',
    intention: 'Una relación',
    lookingFor: 'todos',
  },
  {
    id: 'demo_antonella',
    name: 'Antonella',
    birthdate: '2000-09-18',
    gender: 'mujer',
    city: 'Santiago',
    occupation: 'Abogada & viajera curiosa',
    photo: '/photos/antonella.jpg',
    bio: 'Una buena conversación vale más que mil likes. Me gusta debatir con respeto y encontrar puntos en común.',
    values: ['Libertad', 'Tradición', 'Responsabilidad'],
    interests: ['Viajes', 'Vino', 'Libros'],
    prompt: 'Para conquistarme…',
    answer: 'Sé tú. Y si sabes dónde sirven el mejor café, mejor todavía.',
    intention: 'Ver qué pasa',
    lookingFor: 'todos',
  },
  {
    id: 'demo_nicolas',
    name: 'Nicolás',
    birthdate: '1995-11-09',
    gender: 'hombre',
    city: 'Concepción',
    occupation: 'Profesor & músico amateur',
    photo: '/photos/nicolas.jpg',
    bio: 'Familia primero, guitarra después. Me entusiasma aprender algo nuevo cada día y compartirlo con alguien.',
    values: ['Familia', 'Tradición', 'Patria'],
    interests: ['Música', 'Cocina', 'Trekking'],
    prompt: 'Mi talento poco útil…',
    answer: 'Reconocer una canción con las primeras tres notas.',
    intention: 'Una relación',
    lookingFor: 'todos',
  },
];

export function openDatabase(filename = process.env.DATABASE_PATH || './data/rigthnder.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, google_sub TEXT UNIQUE,
      name TEXT NOT NULL, birthdate TEXT NOT NULL, gender TEXT NOT NULL,
      city TEXT NOT NULL, occupation TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
      photo TEXT NOT NULL DEFAULT '', values_json TEXT NOT NULL DEFAULT '[]', interests_json TEXT NOT NULL DEFAULT '[]',
      prompt TEXT NOT NULL DEFAULT 'Mi primera cita ideal sería…', answer TEXT NOT NULL DEFAULT '',
      intention TEXT NOT NULL DEFAULT 'Una relación', looking_for TEXT NOT NULL DEFAULT 'todos',
      demo INTEGER NOT NULL DEFAULT 0, seed INTEGER NOT NULL DEFAULT 0,
      consent_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS swipes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK(action IN ('like','pass','super')),
      created_at INTEGER NOT NULL, PRIMARY KEY(user_id,target_id), CHECK(user_id != target_id)
    );
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY, user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, UNIQUE(user_a,user_b), CHECK(user_a < user_b)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blocks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY(user_id,target_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS messages_match_time ON messages(match_id,created_at);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS oauth_states (state_hash TEXT PRIMARY KEY, native INTEGER NOT NULL, challenge TEXT, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_pending (ticket_hash TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_handoffs (code_hash TEXT PRIMARY KEY, payload TEXT NOT NULL, challenge TEXT NOT NULL, expires_at INTEGER NOT NULL);
  `);
  // Migración aditiva: conserva cuentas, conversaciones y mensajes de la versión anterior.
  for (const [table, column, definition] of [
    ['users', 'community_json', "TEXT NOT NULL DEFAULT '{}'"],
    ['users', 'last_seen', 'INTEGER NOT NULL DEFAULT 0'],
    ['messages', 'kind', "TEXT NOT NULL DEFAULT 'text'"],
  ]) {
    if (
      !db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((c) => c.name === column)
    )
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS date_invitations (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
      day TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_date ON date_invitations(conversation_id) WHERE status='pending';
    CREATE TABLE IF NOT EXISTS conversation_signals (
      conversation_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(conversation_id,sender_id)
    );
    CREATE TABLE IF NOT EXISTS message_reactions (
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction TEXT NOT NULL, PRIMARY KEY(message_id,user_id)
    );
  `);
  const insert = db.prepare(`INSERT OR IGNORE INTO users
    (id,name,birthdate,gender,city,occupation,photo,bio,values_json,interests_json,prompt,answer,intention,looking_for,demo,seed,consent_at,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1,?,?)`);
  for (const p of DEMO_PROFILES)
    insert.run(
      p.id,
      p.name,
      p.birthdate,
      p.gender,
      p.city,
      p.occupation,
      p.photo,
      p.bio,
      JSON.stringify(p.values),
      JSON.stringify(p.interests),
      p.prompt,
      p.answer,
      p.intention,
      p.lookingFor,
      new Date().toISOString(),
      new Date().toISOString(),
    );
  const sampleDetails = [
    [
      'Libertaria',
      ['Mises TV', 'La Cofradía'],
      ['Thomas Sowell', 'Axel Kaiser'],
      'Sí',
      'Ortodoxa',
      'Sí',
      'Simpatizo',
      'PNL',
      14,
    ],
    [
      'Liberal clásico',
      ['Agricultura'],
      ['Hayek', 'Mises'],
      'En búsqueda',
      '',
      'Algún día',
      'Ninguno',
      '',
      6,
    ],
    [
      'Conservadora',
      ['La Cofrarneta'],
      ['Chesterton', 'C. S. Lewis'],
      'Sí',
      'Católica',
      'Sí',
      'Simpatizo',
      'Republicanos',
      11,
    ],
    [
      'Libertario',
      ['Ingobernables'],
      ['Hayek', 'Ayn Rand'],
      'No',
      '',
      'Algún día',
      'Ninguno',
      '',
      9,
    ],
    [
      'Liberal clásica',
      ['Mises TV'],
      ['Thomas Sowell', 'Hayek'],
      'No',
      '',
      'No',
      'Simpatizo',
      'Evópoli',
      8,
    ],
    ['Conservador', ['La Cofradía'], ['Chesterton'], 'Sí', 'Católica', 'Sí', 'Ninguno', '', 4],
  ];
  DEMO_PROFILES.forEach((p, i) => {
    const [
      current,
      streamers,
      authors,
      faith,
      denomination,
      children,
      partyStance,
      party,
      countryCount,
    ] = sampleDetails[i];
    db.prepare("UPDATE users SET community_json=? WHERE id=? AND community_json='{}'").run(
      JSON.stringify({
        photos: [p.photo, '/photos/coast.jpg', '/photos/cafe.jpg'],
        region: p.city === 'Santiago' ? 'Metropolitana' : p.city,
        nationalities: ['Chilena'],
        workMode: 'Trabajo',
        current,
        streamers,
        creators: [],
        authors,
        faith,
        denomination,
        children,
        partyStance,
        party,
        countryCount,
        years: '1 a 5 años',
        languages: [
          { language: 'Español', level: 'Nativo' },
          { language: 'Inglés', level: 'Avanzado' },
        ],
        countries: ['Argentina', 'España'],
        sensitiveConsent: true,
        completed: true,
      }),
      p.id,
    );
  });
  return db;
}

export function ageOf(birthdate, now = new Date()) {
  const birth = new Date(`${birthdate}T00:00:00Z`);
  return (
    now.getUTCFullYear() -
    birth.getUTCFullYear() -
    (now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
      ? 1
      : 0)
  );
}

export function publicProfile(user) {
  return {
    id: user.id,
    name: user.name,
    age: ageOf(user.birthdate),
    gender: user.gender,
    city: user.city,
    occupation: user.occupation,
    bio: user.bio,
    photo: user.photo,
    values: JSON.parse(user.values_json),
    interests: JSON.parse(user.interests_json),
    prompt: user.prompt,
    answer: user.answer,
    intention: user.intention,
    lookingFor: user.looking_for,
    demo: !!user.demo,
    community: JSON.parse(user.community_json || '{}'),
    online: !!user.seed || Date.now() - user.last_seen < 180_000,
  };
}

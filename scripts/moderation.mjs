import { DatabaseSync } from 'node:sqlite';

const file = process.env.DATABASE_PATH;
if (!file) throw Error('Configura DATABASE_PATH con la base privada del servidor.');
const db = new DatabaseSync(file);
const [command, value, role = 'moderator'] = process.argv.slice(2);
try {
  if (command === 'grant' && value) {
    if (!['moderator', 'admin'].includes(role)) throw Error('El rol debe ser moderator o admin.');
    const result = db
      .prepare("UPDATE users SET moderation_role=? WHERE lower(email)=lower(?) AND demo=0")
      .run(role, value.trim());
    if (!result.changes) throw Error('No se encontró una cuenta real con ese correo.');
    console.log({ granted: result.changes, role });
  } else if (command === 'reports') {
    const status = value || 'pending';
    if (!['pending', 'reviewing', 'resolved', 'dismissed', 'all'].includes(status))
      throw Error('Estado no válido.');
    const rows = db
      .prepare(
        `SELECT r.id,r.reason,r.details,r.created_at,r.user_id,r.target_id,r.status,
          target.name AS target_name,target.email AS target_email
         FROM reports r JOIN users target ON target.id=r.target_id
         WHERE target.demo=0 AND (?='all' OR r.status=?) ORDER BY r.created_at`,
      )
      .all(status, status);
    console.log(JSON.stringify(rows, null, 2));
  } else if (command === 'feedback') {
    console.log(
      JSON.stringify(
        db
          .prepare(
            'SELECT f.*,u.email FROM beta_feedback f JOIN users u ON u.id=f.user_id ORDER BY f.created_at DESC',
          )
          .all(),
        null,
        2,
      ),
    );
  } else {
    throw Error(
      'Usa grant <correo> [moderator|admin], reports [estado] o feedback. Acceso exclusivo del operador.',
    );
  }
} finally {
  db.close();
}

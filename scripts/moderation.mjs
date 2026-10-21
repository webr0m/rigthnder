// Operador local del servidor. No publica datos ni abre un endpoint de administración.
import { DatabaseSync } from 'node:sqlite';
const file = process.env.DATABASE_PATH;
if (!file) throw Error('Configura DATABASE_PATH con la base privada del servidor.');
const db = new DatabaseSync(file);
const [command, id] = process.argv.slice(2);
if (command === 'reports')
  console.log(
    JSON.stringify(
      db
        .prepare(
          "SELECT r.id,r.reason,r.details,r.created_at,r.user_id,r.target_id,r.status FROM reports r WHERE r.status='pending' ORDER BY r.created_at",
        )
        .all(),
      null,
      2,
    ),
  );
else if (command === 'feedback')
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
else if (command === 'reviewed' && id) {
  const result = db.prepare("UPDATE reports SET status='reviewed' WHERE id=?").run(id);
  console.log({ updated: result.changes });
} else throw Error('Usa reports, feedback o reviewed <id>. Acceso exclusivo del operador.');
db.close();

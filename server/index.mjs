import { openDatabase } from './db.mjs';
import { createApp } from './app.mjs';
const db = openDatabase();
const port = Number(process.env.PORT || 3000);
const server = createApp(db).listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`OnlyFachos listo: http://localhost:${port}`),
);
function close() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', close);
process.on('SIGINT', close);

import { openDatabase } from './db.mjs';
import { createApp } from './app.mjs';
const db = openDatabase();
const port = Number(process.env.PORT || 3000);
const app = createApp(db);
app.locals.push.start();
const server = app.listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`OnlyFachos listo: http://localhost:${server.address().port}`),
);
function close() {
  server.close(async () => {
    await app.locals.push.close();
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', close);
process.on('SIGINT', close);

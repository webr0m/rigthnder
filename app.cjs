// Entrada compatible con Passenger / «Setup Node.js App» de cPanel.
process.chdir(__dirname);
try { process.loadEnvFile(__dirname + '/.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
try {
  if (require('node:fs').existsSync(__dirname+'/server-build/onlyfachos.cjs')) require('./server-build/onlyfachos.cjs');
  else import('./server/index.mjs').catch(error=>{console.error('OnlyFachos no pudo iniciar:',error.message);process.exit(1);});
} catch(error) {console.error('OnlyFachos no pudo iniciar:',error.message);process.exit(1);}

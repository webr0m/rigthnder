// Entrada compatible con Passenger / «Setup Node.js App» de cPanel.
process.chdir(__dirname);
try { process.loadEnvFile(__dirname + '/.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
import('./server/index.mjs').catch(error=>{console.error('Rigthnder no pudo iniciar:',error.message);process.exit(1);});

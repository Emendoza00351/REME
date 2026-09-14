/**
 * Migra y siembra la base antes de correr los tests (npm test no arranca el
 * servidor real — cada test levanta su propio app.listen(0) — así que nadie
 * más dispara las migraciones). Pensado para CI; en local normalmente ya
 * corriste el backend al menos una vez y la base ya está lista.
 *
 * Uso: node scripts/preparar-db.mjs
 */
import 'dotenv/config';

const { pool } = await import('../src/store/db.js');
const { prepararBaseDeDatos } = await import('../src/store/inicializar.js');

try {
  await prepararBaseDeDatos();
  console.log('Base de datos lista para los tests.');
} catch (err) {
  console.error('No se pudo preparar la base de datos:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

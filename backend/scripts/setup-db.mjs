/**
 * Crea la base de datos "reme" si todavía no existe.
 * Lee la conexión desde backend/.env (nunca desde la línea de comandos).
 *
 * Uso: node scripts/setup-db.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;

if (!PGPASSWORD) {
  console.error('Falta PGPASSWORD en backend/.env — copia .env.example a .env y completa la contraseña.');
  process.exit(1);
}

const dbName = PGDATABASE || 'reme';

/* Para poder crear la BD hay que conectarse primero a la BD de mantenimiento
   "postgres", que siempre existe. */
const admin = new pg.Client({
  host: PGHOST || 'localhost',
  port: Number(PGPORT) || 5432,
  user: PGUSER || 'postgres',
  password: PGPASSWORD,
  database: 'postgres',
});

try {
  await admin.connect();
  console.log(`Conectado a PostgreSQL en ${PGHOST || 'localhost'}:${PGPORT || 5432}`);

  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

  if (rows.length > 0) {
    console.log(`La base de datos "${dbName}" ya existe — no se toca.`);
  } else {
    // No se puede parametrizar el nombre en CREATE DATABASE; se valida antes.
    if (!/^[a-z_][a-z0-9_]*$/.test(dbName)) {
      throw new Error(`Nombre de base de datos inválido: "${dbName}"`);
    }
    await admin.query(`CREATE DATABASE ${dbName}`);
    console.log(`Base de datos "${dbName}" creada.`);
  }
} catch (err) {
  console.error('No se pudo crear la base de datos:', err.message);
  process.exitCode = 1;
} finally {
  await admin.end();
}

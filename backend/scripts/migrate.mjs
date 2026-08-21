/**
 * Corre las migraciones de backend/migrations/*.sql en orden, una sola vez
 * cada una (registradas en la tabla _migraciones). Lee la conexión desde
 * backend/.env — nunca desde la línea de comandos.
 *
 * Uso: node scripts/migrate.mjs
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, '..', 'migrations');

const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;

if (!PGPASSWORD) {
  console.error('Falta PGPASSWORD en backend/.env');
  process.exit(1);
}

const client = new pg.Client({
  host: PGHOST || 'localhost',
  port: Number(PGPORT) || 5432,
  user: PGUSER || 'postgres',
  password: PGPASSWORD,
  database: PGDATABASE || 'reme',
});

try {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migraciones (
      nombre VARCHAR(200) PRIMARY KEY,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows: aplicadas } = await client.query('SELECT nombre FROM _migraciones');
  const yaAplicadas = new Set(aplicadas.map((r) => r.nombre));

  const archivos = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let pendientes = 0;
  for (const archivo of archivos) {
    if (yaAplicadas.has(archivo)) {
      console.log(`  ya aplicada: ${archivo}`);
      continue;
    }
    pendientes++;
    const sql = await readFile(path.join(migrationsDir, archivo), 'utf8');
    console.log(`  aplicando: ${archivo}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _migraciones (nombre) VALUES ($1)', [archivo]);
      await client.query('COMMIT');
      console.log(`  ✓ ${archivo}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Falló ${archivo}: ${err.message}`);
    }
  }

  console.log(pendientes === 0 ? 'Todo al día — nada por aplicar.' : `Listo — ${pendientes} migración(es) aplicada(s).`);
} catch (err) {
  console.error('Error corriendo migraciones:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

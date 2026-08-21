/**
 * Corre las migraciones de backend/migrations/*.sql pendientes, una sola vez
 * cada una (registradas en _migraciones). La usan tanto scripts/migrate.mjs
 * (a mano, en local) como index.js al arrancar (para que Railway u otro
 * entorno de despliegue no dependa de un paso manual aparte).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, '..', '..', 'migrations');

export async function ejecutarMigracionesPendientes() {
  const client = await pool.connect();
  let aplicadas = 0;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migraciones (
        nombre VARCHAR(200) PRIMARY KEY,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT nombre FROM _migraciones');
    const yaAplicadas = new Set(rows.map((r) => r.nombre));

    const archivos = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {
      if (yaAplicadas.has(archivo)) {
        console.log(`[migraciones] ya aplicada: ${archivo}`);
        continue;
      }

      console.log(`[migraciones] aplicando: ${archivo}`);
      await client.query('BEGIN');
      try {
        const sql = await readFile(path.join(migrationsDir, archivo), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO _migraciones (nombre) VALUES ($1)', [archivo]);
        await client.query('COMMIT');
        console.log(`[migraciones] ✓ ${archivo}`);
        aplicadas++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${archivo}: ${err.message}`);
      }
    }
  } finally {
    client.release();
  }

  return aplicadas;
}

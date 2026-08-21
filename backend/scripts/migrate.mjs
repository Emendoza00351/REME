/**
 * Corre a mano las migraciones de backend/migrations/*.sql pendientes contra
 * la base que apunte backend/.env. La lógica real vive en
 * src/store/migrar.js — index.js llama a la misma función al arrancar, así
 * que este script y el arranque del servidor nunca quedan desincronizados.
 *
 * Uso: node scripts/migrate.mjs
 */
import 'dotenv/config';

if (!process.env.PGPASSWORD) {
  console.error('Falta PGPASSWORD en backend/.env');
  process.exit(1);
}

const { pool } = await import('../src/store/db.js');
const { ejecutarMigracionesPendientes } = await import('../src/store/migrar.js');

try {
  const aplicadas = await ejecutarMigracionesPendientes();
  console.log(aplicadas === 0 ? 'Todo al día — nada por aplicar.' : `Listo — ${aplicadas} migración(es) aplicada(s).`);
} catch (err) {
  console.error('Error corriendo migraciones:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

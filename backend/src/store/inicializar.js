/**
 * Migraciones + seed, en un solo lugar. Lo usa tanto index.js al arrancar el
 * servidor real como scripts/preparar-db.mjs (CI y cualquier entorno que
 * necesite la base lista sin levantar Express — ver test/*.test.js, que
 * arrancan su propio server efímero con app.listen(0)).
 */
import { pool } from './db.js';
import { ejecutarMigracionesPendientes } from './migrar.js';
import { roles, seedBaseSiVacio } from './seed.js';
import { seedCatalogoSiVacio } from './catalogo.js';
import { seedPermisosSiVacio } from '../middleware/permisos.js';

export async function prepararBaseDeDatos() {
  await pool.query('SELECT 1'); // falla rápido y claro si Postgres no está arriba

  await ejecutarMigracionesPendientes();
  await seedBaseSiVacio();
  const admin = await roles.findBy('nombre', 'ADMIN');
  const gerente = await roles.findBy('nombre', 'GERENTE');
  const vendedor = await roles.findBy('nombre', 'VENDEDOR');
  await seedPermisosSiVacio(admin.id_rol, gerente.id_rol, vendedor.id_rol);
  await seedCatalogoSiVacio();
}

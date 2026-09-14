/**
 * Acceso a la base de datos real (PostgreSQL) — reemplaza al almacén en
 * memoria que existía mientras no había BD conectada. La conexión sale de
 * las variables PG* en backend/.env (nunca hardcodeada ni por línea de
 * comandos).
 *
 * `createTable(tabla, pkField)` expone la misma API que antes tenía la
 * versión en memoria (list/find/findBy/insert/update/remove/count) para que
 * las rutas seguían funcionando igual, solo que ahora cada método es
 * asíncrono porque habla con Postgres de verdad.
 */
import 'dotenv/config';
import pg from 'pg';

export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'reme',
});

// Columnas que existen en (casi) todas las tablas de negocio y que la capa
// genérica sabe mantener sola, sin que cada ruta tenga que acordarse.
const TIENE_ACTUALIZADO_EN = new Set([
  'roles', 'empleados', 'usuarios', 'permisos_rol',
  'clientes', 'productos', 'pedidos', 'inventario', 'gastos',
]);

function createTable(tabla, pkField) {
  const tieneActualizadoEn = TIENE_ACTUALIZADO_EN.has(tabla);

  return {
    pkField,

    async list({ orderBy = pkField, desc = false } = {}) {
      const { rows } = await pool.query(
        `SELECT * FROM ${tabla} ORDER BY ${orderBy} ${desc ? 'DESC' : 'ASC'}`,
      );
      return rows;
    },

    async find(id) {
      const { rows } = await pool.query(`SELECT * FROM ${tabla} WHERE ${pkField} = $1`, [id]);
      return rows[0] ?? null;
    },

    async findBy(campo, valor) {
      const { rows } = await pool.query(`SELECT * FROM ${tabla} WHERE ${campo} = $1`, [valor]);
      return rows[0] ?? null;
    },

    async insert(data) {
      const campos = Object.keys(data);
      const placeholders = campos.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        campos.map((c) => data[c]),
      );
      return rows[0];
    },

    async update(id, data) {
      const campos = Object.keys(data).filter((c) => c !== pkField && !(tieneActualizadoEn && c === 'actualizado_en'));
      if (campos.length === 0) return this.find(id);

      const sets = campos.map((c, i) => `${c} = $${i + 1}`);
      if (tieneActualizadoEn) sets.push('actualizado_en = now()');

      const { rows } = await pool.query(
        `UPDATE ${tabla} SET ${sets.join(', ')} WHERE ${pkField} = $${campos.length + 1} RETURNING *`,
        [...campos.map((c) => data[c]), id],
      );
      return rows[0] ?? null;
    },

    async remove(id) {
      const { rows } = await pool.query(`DELETE FROM ${tabla} WHERE ${pkField} = $1 RETURNING *`, [id]);
      return rows[0] ?? null;
    },

    async count() {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${tabla}`);
      return rows[0].n;
    },
  };
}

export { createTable };

/**
 * Bitácora: un evento por cada acción que crea, edita o elimina algo, más
 * los inicios/cierres de sesión. Vive en la tabla real `auditoria`.
 */
import { pool } from './db.js';

export async function registrarEvento({
  idUsuario, idRol, modulo, accion, registroId, metodo, ruta, estado, codigoHttp,
}) {
  await pool.query(
    `INSERT INTO auditoria (id_usuario, id_rol, modulo, accion, registro_id, metodo, ruta, estado, codigo_http)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [idUsuario ?? null, idRol ?? null, modulo, accion, registroId ?? null, metodo, ruta, estado, codigoHttp],
  );
}

export async function listarEventos() {
  const { rows } = await pool.query(`
    SELECT
      a.id_auditoria AS id, a.fecha, a.modulo, a.accion, a.registro_id,
      a.metodo, a.ruta, a.estado, a.codigo_http,
      COALESCE(u.nombre, CASE WHEN a.id_usuario IS NOT NULL THEN 'Usuario #' || a.id_usuario ELSE 'Desconocido' END) AS usuario,
      COALESCE(r.nombre, '') AS rol
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
    LEFT JOIN roles r ON r.id_rol = a.id_rol
    ORDER BY a.id_auditoria DESC
  `);
  return rows;
}

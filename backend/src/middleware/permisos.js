/**
 * Matriz de permisos rol × módulo × acción.
 *
 * La fuente de verdad es la tabla `permisos_rol`, pero cada request no puede
 * pagar un roundtrip a la BD solo para chequear un permiso — por eso se
 * cachea en memoria (`matriz`) al arrancar y se actualiza en cada escritura
 * (setPermisosRol/borrarPermisosRol ya escriben en ambos lados).
 *
 * Todavía no hay login basado en sesión: el actor se resuelve de los headers
 * `x-rol-id` / `x-usuario-id` que manda el frontend tras el login.
 */
import { pool } from '../store/db.js';
import { registrarEvento } from '../store/auditoria.js';

export const MODULOS = [
  'ventas', 'gastos', 'clientes', 'facturacion',
  'productos', 'codigos', 'inventario', 'resultados',
  'empleados', 'usuarios', 'roles', 'auditoria',
];

// Acciones independientes — cada una es un toggle propio, no una jerarquía.
export const ACCIONES = ['ver', 'crear', 'editar', 'eliminar', 'imprimir', 'exportar', 'aprobar'];

export const ROL_ADMIN = 1;

export const permisoVacio = () => Object.fromEntries(ACCIONES.map((a) => [a, false]));
export const permisoTotal = () => Object.fromEntries(ACCIONES.map((a) => [a, true]));

/* Caché viva: Map(id_rol -> Map(modulo -> {ver, crear, ...})) */
const matriz = new Map();

export async function cargarPermisosDesdeDB() {
  const { rows } = await pool.query('SELECT * FROM permisos_rol');
  matriz.clear();
  for (const fila of rows) {
    if (!matriz.has(fila.id_rol)) matriz.set(fila.id_rol, new Map());
    matriz.get(fila.id_rol).set(fila.modulo, Object.fromEntries(ACCIONES.map((a) => [a, !!fila[a]])));
  }
}

export async function setPermisosRol(idRol, filas) {
  const porModulo = new Map();
  for (const fila of filas) {
    if (!MODULOS.includes(fila.modulo)) continue;
    porModulo.set(fila.modulo, Object.fromEntries(ACCIONES.map((a) => [a, !!fila[a]])));
  }
  matriz.set(Number(idRol), porModulo);

  for (const [modulo, acciones] of porModulo) {
    const columnas = ['id_rol', 'modulo', ...ACCIONES];
    const valores = [idRol, modulo, ...ACCIONES.map((a) => acciones[a])];
    const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');
    const actualizarSet = ACCIONES.map((a) => `${a} = EXCLUDED.${a}`).join(', ');
    await pool.query(
      `INSERT INTO permisos_rol (${columnas.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id_rol, modulo) DO UPDATE SET ${actualizarSet}, actualizado_en = now()`,
      valores,
    );
  }
}

export function getPermisosRol(idRol) {
  const porModulo = matriz.get(Number(idRol)) ?? new Map();
  return MODULOS.map((modulo) => ({
    modulo,
    ...(porModulo.get(modulo) ?? permisoVacio()),
  }));
}

export async function borrarPermisosRol(idRol) {
  matriz.delete(Number(idRol));
  await pool.query('DELETE FROM permisos_rol WHERE id_rol = $1', [idRol]);
}

export function puede(idRol, modulo, accion) {
  const porModulo = matriz.get(Number(idRol));
  if (!porModulo) return false;
  return !!porModulo.get(modulo)?.[accion];
}

/* Matriz por defecto — ADMIN: todo. GERENTE: todo menos seguridad.
   VENDEDOR: ventas/clientes. Solo se siembra si la tabla está vacía. */
export async function seedPermisosSiVacio(idRolAdmin, idRolGerente, idRolVendedor) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM permisos_rol');
  if (rows[0].n > 0) {
    await cargarPermisosDesdeDB();
    return;
  }

  const todo = (modulo) => ({ modulo, ...permisoTotal() });
  const nada = (modulo) => ({ modulo, ...permisoVacio() });
  const soloLectura = (modulo) => ({ ...nada(modulo), ver: true, imprimir: true, exportar: true });

  const SEGURIDAD = ['empleados', 'usuarios', 'roles', 'auditoria'];
  const VENDEDOR_ESCRIBE = ['ventas', 'clientes'];
  const VENDEDOR_LEE = ['productos', 'codigos', 'inventario'];

  await setPermisosRol(idRolAdmin, MODULOS.map(todo));
  await setPermisosRol(idRolGerente, MODULOS.map((m) => (SEGURIDAD.includes(m) ? nada(m) : todo(m))));
  await setPermisosRol(idRolVendedor, MODULOS.map((m) => {
    if (VENDEDOR_ESCRIBE.includes(m)) return todo(m);
    if (VENDEDOR_LEE.includes(m)) return soloLectura(m);
    return nada(m);
  }));
}

/* Acción por defecto según el verbo HTTP, para que las rutas puedan llamar
   requirePermission('empleados') sin repetir la acción en cada endpoint. */
function accionPorDefecto(method) {
  if (method === 'GET') return 'ver';
  if (method === 'POST') return 'crear';
  if (method === 'DELETE') return 'eliminar';
  return 'editar'; // PUT / PATCH
}

export function resolverRol(req) {
  const raw = req.get('x-rol-id');
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : ROL_ADMIN;
}

/* Igual que resolverRol, pero sin caer a un valor por defecto: si el
   frontend no manda quién es, la bitácora debe quedar con "Desconocido"
   en vez de inventarse un usuario. */
export function resolverUsuario(req) {
  const raw = req.get('x-usuario-id');
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const ACCIONES_AUDITABLES = ['crear', 'editar', 'eliminar'];

function extraerIdRegistro(paramId, body) {
  if (paramId != null) return Number(paramId);
  if (!body || typeof body !== 'object') return null;
  if (body.id != null) return Number(body.id);
  const campoId = Object.keys(body).find((k) => k.startsWith('id_'));
  return campoId ? Number(body[campoId]) : null;
}

export function requirePermission(modulo, accion) {
  return (req, res, next) => {
    const idRol = resolverRol(req);
    const idUsuario = resolverUsuario(req);
    req.idRol = idRol;
    req.idUsuario = idUsuario;

    const acc = accion ?? accionPorDefecto(req.method);
    if (!puede(idRol, modulo, acc)) {
      return res.status(403).json({
        error: `El rol ${idRol} no tiene permiso para "${acc}" en ${modulo}`,
      });
    }

    if (ACCIONES_AUDITABLES.includes(acc)) {
      const enviarJson = res.json.bind(res);
      res.json = (body) => {
        res.locals.auditBody = body;
        return enviarJson(body);
      };

      res.on('finish', () => {
        registrarEvento({
          idUsuario,
          idRol,
          modulo,
          accion: acc,
          registroId: extraerIdRegistro(req.params?.id, res.locals.auditBody),
          metodo: req.method,
          ruta: req.originalUrl,
          estado: res.statusCode < 400 ? 'ok' : 'error',
          codigoHttp: res.statusCode,
        }).catch((err) => console.error('[auditoria]', err.message));
      });
    }

    next();
  };
}

import { Router } from 'express';
import { empleados, roles, usuarios } from '../store/seed.js';
import { getPermisosRol, resolverRol, resolverUsuario } from '../middleware/permisos.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { registrarEvento } from '../store/auditoria.js';

/* Hash válido de una contraseña que nadie tiene: se compara contra esto
   cuando el usuario no existe, para que verifyPassword() siempre haga el
   mismo trabajo de scrypt y la respuesta de /login no tarde distinto según
   si el usuario existe o no (evita enumerar usuarios por timing). */
const HASH_DUMMY = hashPassword('usuario-inexistente');

const router = Router();

const texto = (v) => String(v ?? '').trim();

/* PermissionsContext del frontend espera un Record<modulo, {ver, crear, ...}>,
   pero getPermisosRol() devuelve un array — se convierte acá para que
   can(modulo, accion) del frontend funcione tal cual está escrito. */
function permisosComoRecord(idRol) {
  const filas = getPermisosRol(idRol);
  return Object.fromEntries(filas.map(({ modulo, ...acciones }) => [modulo, acciones]));
}

async function conSesion(u) {
  const rol = await roles.find(u.id_rol);
  const emp = u.id_empleado != null ? await empleados.find(u.id_empleado) : null;
  return {
    id_usuario: u.id_usuario,
    usuario: u.usuario,
    nombre: u.nombre,
    correo: u.correo,
    id_rol: u.id_rol,
    rol: rol?.nombre ?? null,
    empleado: emp?.nombre ?? null,
    permisos: permisosComoRecord(u.id_rol),
    token: signToken({ id_usuario: u.id_usuario, id_rol: u.id_rol }),
  };
}

/* ── POST /api/login ── */
router.post('/login', async (req, res, next) => {
  try {
    const usuario = texto(req.body?.usuario).toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const u = await usuarios.findBy('usuario', usuario);
    const passwordValida = verifyPassword(password, u?.password_hash ?? HASH_DUMMY);
    if (!u || !passwordValida) {
      await registrarEvento({
        idUsuario: u?.id_usuario ?? null, idRol: u?.id_rol ?? null,
        modulo: 'auth', accion: 'login_fallido', registroId: null,
        metodo: 'POST', ruta: '/api/login', estado: 'error', codigoHttp: 401,
      });
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    if (u.estado !== 'Activo') {
      await registrarEvento({
        idUsuario: u.id_usuario, idRol: u.id_rol,
        modulo: 'auth', accion: 'login_bloqueado', registroId: u.id_usuario,
        metodo: 'POST', ruta: '/api/login', estado: 'error', codigoHttp: 403,
      });
      return res.status(403).json({ error: 'Este usuario está inactivo' });
    }

    await usuarios.update(u.id_usuario, { ultimo_acceso: new Date().toISOString() });
    await registrarEvento({
      idUsuario: u.id_usuario, idRol: u.id_rol,
      modulo: 'auth', accion: 'login', registroId: u.id_usuario,
      metodo: 'POST', ruta: '/api/login', estado: 'ok', codigoHttp: 200,
    });
    res.json(await conSesion(u));
  } catch (err) { next(err); }
});

/* ── POST /api/logout ── */
router.post('/logout', async (req, res, next) => {
  try {
    const idUsuario = resolverUsuario(req);
    const idRol = resolverRol(req);

    await registrarEvento({
      idUsuario, idRol,
      modulo: 'auth', accion: 'logout', registroId: idUsuario,
      metodo: 'POST', ruta: '/api/logout', estado: 'ok', codigoHttp: 200,
    });
    res.json({ message: 'Sesión cerrada' });
  } catch (err) { next(err); }
});

export default router;

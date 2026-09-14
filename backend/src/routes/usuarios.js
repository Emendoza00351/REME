import { Router } from 'express';
import { empleados, roles, usuarios } from '../store/seed.js';
import { requirePermission } from '../middleware/permisos.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { CORREO_RE, ESTADOS, texto } from '../utils/validadores.js';

const router = Router();

const MIN_PASSWORD = 8;

/* El hash nunca sale del backend. */
const publico = ({ password_hash, ...resto }) => resto;

async function conRelaciones(u) {
  const rol = await roles.find(u.id_rol);
  const emp = u.id_empleado != null ? await empleados.find(u.id_empleado) : null;
  return { ...publico(u), rol: rol?.nombre ?? null, empleado: emp?.nombre ?? null };
}

async function validarReferencias({ id_rol, id_empleado }) {
  if (id_rol !== undefined && !(await roles.find(id_rol))) return 'El rol seleccionado no existe';
  if (id_empleado != null && !(await empleados.find(id_empleado))) return 'El empleado seleccionado no existe';
  return null;
}

/* ── GET /api/usuarios ── */
router.get('/usuarios', requirePermission('usuarios'), async (_req, res, next) => {
  try {
    const lista = await usuarios.list({ orderBy: 'usuario' });
    res.json(await Promise.all(lista.map(conRelaciones)));
  } catch (err) { next(err); }
});

/* ── GET /api/usuarios/:id ── */
router.get('/usuarios/:id', requirePermission('usuarios'), async (req, res, next) => {
  try {
    const u = await usuarios.find(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(await conRelaciones(u));
  } catch (err) { next(err); }
});

/* ── POST /api/usuarios ── */
router.post('/usuarios', requirePermission('usuarios'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const nombre = texto(body.nombre).toUpperCase();
    const correo = texto(body.correo).toLowerCase();
    const password = String(body.password ?? '');
    const estado = texto(body.estado) || 'Activo';
    const idRol = Number(body.id_rol);
    const idEmpleado = body.id_empleado != null && body.id_empleado !== '' ? Number(body.id_empleado) : null;

    // Todo usuario nace atado a un empleado ya dado de alta: no hay cuentas
    // "sueltas". El login no se escribe a mano — es el DNI del empleado.
    if (!Number.isFinite(idEmpleado)) {
      return res.status(400).json({ error: 'Seleccioná el empleado al que pertenece este usuario' });
    }
    const empleado = await empleados.find(idEmpleado);
    if (!empleado) return res.status(400).json({ error: 'El empleado seleccionado no existe' });
    const usuario = texto(empleado.dni);

    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!correo || !CORREO_RE.test(correo)) return res.status(400).json({ error: 'El correo no es válido' });
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `Estado inválido: use ${ESTADOS.join(' o ')}` });
    if (!Number.isFinite(idRol)) return res.status(400).json({ error: 'El rol es requerido' });

    const errRef = await validarReferencias({ id_rol: idRol, id_empleado: idEmpleado });
    if (errRef) return res.status(400).json({ error: errRef });

    if (await usuarios.findBy('id_empleado', idEmpleado)) {
      return res.status(409).json({ error: 'Este empleado ya tiene un usuario asignado' });
    }
    if (await usuarios.findBy('usuario', usuario)) return res.status(409).json({ error: 'El usuario ya existe' });
    if (await usuarios.findBy('correo', correo)) return res.status(409).json({ error: 'El correo ya está registrado' });

    const creado = await usuarios.insert({
      usuario, nombre, correo,
      id_empleado: idEmpleado,
      id_rol: idRol,
      estado,
      password_hash: hashPassword(password),
    });
    res.status(201).json(await conRelaciones(creado));
  } catch (err) { next(err); }
});

/* ── PUT /api/usuarios/:id ── */
router.put('/usuarios/:id', requirePermission('usuarios'), async (req, res, next) => {
  try {
    const actual = await usuarios.find(req.params.id);
    if (!actual) return res.status(404).json({ error: 'Usuario no encontrado' });

    const body = req.body ?? {};
    const datos = {};

    if (body.nombre !== undefined) {
      const nombre = texto(body.nombre).toUpperCase();
      if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
      datos.nombre = nombre;
    }

    if (body.correo !== undefined) {
      const correo = texto(body.correo).toLowerCase();
      if (!CORREO_RE.test(correo)) return res.status(400).json({ error: 'El correo no es válido' });
      const otro = await usuarios.findBy('correo', correo);
      if (otro && otro.id_usuario !== actual.id_usuario) {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }
      datos.correo = correo;
    }

    if (body.estado !== undefined) {
      const estado = texto(body.estado);
      if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `Estado inválido: use ${ESTADOS.join(' o ')}` });
      datos.estado = estado;
    }

    if (body.id_rol !== undefined) {
      const idRol = Number(body.id_rol);
      if (!(await roles.find(idRol))) return res.status(400).json({ error: 'El rol seleccionado no existe' });
      datos.id_rol = idRol;
    }

    if (body.id_empleado !== undefined) {
      const idEmpleado = body.id_empleado != null && body.id_empleado !== '' ? Number(body.id_empleado) : null;
      if (!Number.isFinite(idEmpleado)) {
        return res.status(400).json({ error: 'Todo usuario debe estar vinculado a un empleado' });
      }
      const empleado = await empleados.find(idEmpleado);
      if (!empleado) return res.status(400).json({ error: 'El empleado seleccionado no existe' });

      const otroEmp = await usuarios.findBy('id_empleado', idEmpleado);
      if (otroEmp && otroEmp.id_usuario !== actual.id_usuario) {
        return res.status(409).json({ error: 'Este empleado ya tiene un usuario asignado' });
      }

      // El login sigue siempre al DNI del empleado vinculado — no se edita a mano.
      const usuario = texto(empleado.dni);
      const otroUsuario = await usuarios.findBy('usuario', usuario);
      if (otroUsuario && otroUsuario.id_usuario !== actual.id_usuario) {
        return res.status(409).json({ error: 'El usuario ya existe' });
      }

      datos.id_empleado = idEmpleado;
      datos.usuario = usuario;
    }

    // Cambiar la contraseña acá es opcional (además existe el endpoint
    // dedicado /usuarios/:id/password): si el formulario manda una, se
    // valida y se guarda — antes se ignoraba en silencio.
    if (body.password !== undefined && texto(body.password) !== '') {
      const nuevaPassword = String(body.password);
      if (nuevaPassword.length < MIN_PASSWORD) {
        return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
      }
      datos.password_hash = hashPassword(nuevaPassword);
    }

    res.json(await conRelaciones(await usuarios.update(actual.id_usuario, datos)));
  } catch (err) { next(err); }
});

/* ── PUT /api/usuarios/:id/password ── */
router.put('/usuarios/:id/password', requirePermission('usuarios', 'editar'), async (req, res, next) => {
  try {
    const actual = await usuarios.find(req.params.id);
    if (!actual) return res.status(404).json({ error: 'Usuario no encontrado' });

    const nueva = String(req.body?.password ?? '');
    const anterior = req.body?.password_actual;

    if (nueva.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }
    // Si mandan la anterior, se verifica; si no, es un reset hecho por un admin.
    if (anterior !== undefined && !verifyPassword(String(anterior), actual.password_hash)) {
      return res.status(400).json({ error: 'La contraseña actual no coincide' });
    }

    await usuarios.update(actual.id_usuario, { password_hash: hashPassword(nueva) });
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) { next(err); }
});

/* ── DELETE /api/usuarios/:id ── */
router.delete('/usuarios/:id', requirePermission('usuarios'), async (req, res, next) => {
  try {
    const u = await usuarios.find(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Sin login todavía no hay "usuario actual": el resguardo es no dejar el
    // sistema sin ningún administrador activo.
    const todos = await usuarios.list();
    const otrosAdmins = todos.filter(
      (x) => Number(x.id_rol) === 1 && x.estado === 'Activo' && x.id_usuario !== u.id_usuario,
    );
    if (Number(u.id_rol) === 1 && otrosAdmins.length === 0) {
      return res.status(409).json({ error: 'No se puede eliminar el último usuario administrador' });
    }

    await usuarios.remove(u.id_usuario);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) { next(err); }
});

export default router;

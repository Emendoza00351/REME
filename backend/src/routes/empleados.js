import { Router } from 'express';
import { empleados, usuarios } from '../store/seed.js';
import { requirePermission } from '../middleware/permisos.js';

const router = Router();

// Formato de identidad hondureña: 0000-0000-00000
const DNI_RE = /^\d{4}-\d{4}-\d{5}$/;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESTADOS = ['Activo', 'Inactivo'];

const texto = (v) => String(v ?? '').trim();

function validar(body, { parcial = false } = {}) {
  const errores = [];
  const dni = texto(body.dni);
  const nombre = texto(body.nombre);
  const correo = texto(body.correo);
  const estado = texto(body.estado);

  if (!parcial || body.dni !== undefined) {
    if (!dni) errores.push('El DNI es requerido');
    else if (!DNI_RE.test(dni)) errores.push('El DNI debe tener el formato 0000-0000-00000');
  }
  if (!parcial || body.nombre !== undefined) {
    if (!nombre) errores.push('El nombre es requerido');
  }
  if (correo && !CORREO_RE.test(correo)) errores.push('El correo no es válido');
  if (estado && !ESTADOS.includes(estado)) errores.push(`Estado inválido: use ${ESTADOS.join(' o ')}`);

  return errores;
}

function normalizar(body) {
  const out = {};
  if (body.dni !== undefined) out.dni = texto(body.dni);
  if (body.nombre !== undefined) out.nombre = texto(body.nombre).toUpperCase();
  if (body.telefono !== undefined) out.telefono = texto(body.telefono);
  if (body.correo !== undefined) out.correo = texto(body.correo).toLowerCase();
  if (body.cargo !== undefined) out.cargo = texto(body.cargo).toUpperCase();
  if (body.estado !== undefined) out.estado = texto(body.estado) || 'Activo';
  if (body.fecha_ingreso !== undefined) out.fecha_ingreso = texto(body.fecha_ingreso) || null;
  return out;
}

/* ── GET /api/empleados ── */
router.get('/empleados', requirePermission('empleados'), async (_req, res, next) => {
  try {
    res.json(await empleados.list({ orderBy: 'nombre' }));
  } catch (err) { next(err); }
});

/* ── GET /api/empleados/:id ── */
router.get('/empleados/:id', requirePermission('empleados'), async (req, res, next) => {
  try {
    const emp = await empleados.find(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(emp);
  } catch (err) { next(err); }
});

/* ── POST /api/empleados ── */
router.post('/empleados', requirePermission('empleados'), async (req, res, next) => {
  try {
    const errores = validar(req.body ?? {});
    if (errores.length) return res.status(400).json({ error: errores[0], errores });

    const datos = normalizar(req.body);
    if (await empleados.findBy('dni', datos.dni)) {
      return res.status(409).json({ error: 'El DNI ya está registrado' });
    }
    if (datos.correo && (await empleados.findBy('correo', datos.correo))) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    res.status(201).json(await empleados.insert({
      telefono: '', correo: '', cargo: '', estado: 'Activo', fecha_ingreso: null, ...datos,
    }));
  } catch (err) { next(err); }
});

/* ── PUT /api/empleados/:id ── */
router.put('/empleados/:id', requirePermission('empleados'), async (req, res, next) => {
  try {
    const actual = await empleados.find(req.params.id);
    if (!actual) return res.status(404).json({ error: 'Empleado no encontrado' });

    const errores = validar(req.body ?? {}, { parcial: true });
    if (errores.length) return res.status(400).json({ error: errores[0], errores });

    const datos = normalizar(req.body);

    // Duplicados: ignorando al propio registro que se está editando
    const otroDni = datos.dni && (await empleados.findBy('dni', datos.dni));
    if (otroDni && otroDni.id_empleado !== actual.id_empleado) {
      return res.status(409).json({ error: 'El DNI ya está registrado' });
    }
    const otroCorreo = datos.correo && (await empleados.findBy('correo', datos.correo));
    if (otroCorreo && otroCorreo.id_empleado !== actual.id_empleado) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    res.json(await empleados.update(actual.id_empleado, datos));
  } catch (err) { next(err); }
});

/* ── DELETE /api/empleados/:id ── */
router.delete('/empleados/:id', requirePermission('empleados'), async (req, res, next) => {
  try {
    const emp = await empleados.find(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });

    // Un empleado con usuario asociado no se borra: dejaría el usuario huérfano.
    const todos = await usuarios.list();
    const enUso = todos.some((u) => Number(u.id_empleado) === Number(emp.id_empleado));
    if (enUso) {
      return res.status(409).json({ error: 'No se puede eliminar: el empleado tiene un usuario asociado' });
    }

    await empleados.remove(emp.id_empleado);
    res.json({ message: 'Empleado eliminado' });
  } catch (err) { next(err); }
});

export default router;

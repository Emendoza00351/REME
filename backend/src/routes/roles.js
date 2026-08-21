import { Router } from 'express';
import { roles, usuarios } from '../store/seed.js';
import {
  ACCIONES, MODULOS, ROL_ADMIN,
  borrarPermisosRol, getPermisosRol, requirePermission, setPermisosRol,
} from '../middleware/permisos.js';

const router = Router();

const ESTADOS = ['Activo', 'Inactivo'];
const texto = (v) => String(v ?? '').trim();

/* ── Catálogo de módulos y acciones — lo consume la pantalla de permisos ── */
router.get('/roles/catalogo', requirePermission('roles'), (_req, res) => {
  res.json({ modulos: MODULOS, acciones: ACCIONES });
});

/* ── GET /api/roles ── */
router.get('/roles', requirePermission('roles'), async (_req, res, next) => {
  try {
    const lista = await roles.list({ orderBy: 'id_rol' });
    const todos = await usuarios.list();
    const conConteo = lista.map((r) => ({
      ...r,
      usuarios: todos.filter((u) => Number(u.id_rol) === Number(r.id_rol)).length,
    }));
    res.json(conConteo);
  } catch (err) { next(err); }
});

/* ── GET /api/roles/:id ── */
router.get('/roles/:id', requirePermission('roles'), async (req, res, next) => {
  try {
    const rol = await roles.find(req.params.id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(rol);
  } catch (err) { next(err); }
});

/* ── POST /api/roles ── */
router.post('/roles', requirePermission('roles'), async (req, res, next) => {
  try {
    const nombre = texto(req.body?.nombre).toUpperCase();
    const estado = texto(req.body?.estado) || 'Activo';

    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `Estado inválido: use ${ESTADOS.join(' o ')}` });
    if (await roles.findBy('nombre', nombre)) return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });

    const rol = await roles.insert({ nombre, descripcion: texto(req.body?.descripcion), estado });

    // Nace sin permisos: se asignan explícitamente desde la pantalla de permisos.
    await setPermisosRol(rol.id_rol, []);
    res.status(201).json(rol);
  } catch (err) { next(err); }
});

/* ── PUT /api/roles/:id ── */
router.put('/roles/:id', requirePermission('roles'), async (req, res, next) => {
  try {
    const rol = await roles.find(req.params.id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });

    const datos = {};
    if (req.body?.nombre !== undefined) {
      const nombre = texto(req.body.nombre).toUpperCase();
      if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
      const otro = await roles.findBy('nombre', nombre);
      if (otro && otro.id_rol !== rol.id_rol) {
        return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
      }
      datos.nombre = nombre;
    }
    if (req.body?.descripcion !== undefined) datos.descripcion = texto(req.body.descripcion);
    if (req.body?.estado !== undefined) {
      const estado = texto(req.body.estado);
      if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `Estado inválido: use ${ESTADOS.join(' o ')}` });
      if (rol.id_rol === ROL_ADMIN && estado !== 'Activo') {
        return res.status(409).json({ error: 'El rol ADMIN no se puede desactivar' });
      }
      datos.estado = estado;
    }

    res.json(await roles.update(rol.id_rol, datos));
  } catch (err) { next(err); }
});

/* ── DELETE /api/roles/:id ── */
router.delete('/roles/:id', requirePermission('roles'), async (req, res, next) => {
  try {
    const rol = await roles.find(req.params.id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    if (rol.id_rol === ROL_ADMIN) {
      return res.status(409).json({ error: 'El rol ADMIN no se puede eliminar' });
    }

    const todos = await usuarios.list();
    const enUso = todos.some((u) => Number(u.id_rol) === Number(rol.id_rol));
    if (enUso) return res.status(409).json({ error: 'No se puede eliminar un rol en uso' });

    await roles.remove(rol.id_rol);
    await borrarPermisosRol(rol.id_rol);
    res.json({ message: 'Rol eliminado' });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════
   PERMISOS POR ROL
══════════════════════════════════════════ */

/* ── GET /api/roles/:id/permisos ── */
router.get('/roles/:id/permisos', requirePermission('roles'), async (req, res, next) => {
  try {
    const rol = await roles.find(req.params.id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(getPermisosRol(rol.id_rol));
  } catch (err) { next(err); }
});

/* ── PUT /api/roles/:id/permisos ── */
router.put('/roles/:id/permisos', requirePermission('roles', 'editar'), async (req, res, next) => {
  try {
    const rol = await roles.find(req.params.id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    if (rol.id_rol === ROL_ADMIN) {
      return res.status(409).json({ error: 'Los permisos del rol ADMIN no se pueden modificar' });
    }

    const filas = Array.isArray(req.body?.permisos) ? req.body.permisos : null;
    if (!filas) return res.status(400).json({ error: 'Se espera { permisos: [...] }' });

    for (const fila of filas) {
      if (!MODULOS.includes(fila?.modulo)) {
        return res.status(400).json({ error: `Módulo inválido: ${fila?.modulo}` });
      }
      for (const accion of ACCIONES) {
        if (typeof fila[accion] !== 'boolean') {
          return res.status(400).json({ error: `"${accion}" de ${fila.modulo} debe ser true o false` });
        }
      }
    }

    await setPermisosRol(rol.id_rol, filas);
    res.json(getPermisosRol(rol.id_rol));
  } catch (err) { next(err); }
});

export default router;

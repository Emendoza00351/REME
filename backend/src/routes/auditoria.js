import { Router } from 'express';
import { listarEventos } from '../store/auditoria.js';
import { requirePermission } from '../middleware/permisos.js';

const router = Router();

/* ── GET /api/auditoria ── */
router.get('/auditoria', requirePermission('auditoria'), async (_req, res, next) => {
  try {
    const eventos = (await listarEventos()).map((e) => ({
      id: e.id,
      fecha: e.fecha,
      usuario: e.usuario,
      rol: e.rol,
      modulo: e.modulo,
      accion: e.accion,
      registroId: e.registro_id,
      metodo: e.metodo,
      ruta: e.ruta,
      estado: e.estado,
      codigoHttp: e.codigo_http,
    }));
    res.json(eventos);
  } catch (err) {
    next(err);
  }
});

export default router;

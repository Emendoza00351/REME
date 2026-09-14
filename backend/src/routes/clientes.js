import { Router } from 'express';
import { clientes } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';
import { texto } from '../utils/validadores.js';

const router = Router();

router.get('/clientes', requirePermission('clientes'), async (req, res, next) => {
  try {
    const query = texto(req.query.q).toLowerCase();
    const rows = await clientes.list({ orderBy: 'nombre' });
    res.json(query ? rows.filter((row) => texto(row.nombre).toLowerCase().includes(query)) : rows);
  } catch (err) { next(err); }
});

router.post('/clientes', requirePermission('clientes', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const nombre = texto(body.nombre ?? body.cliente);
    if (!nombre) return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
    const item = await clientes.insert({
      nombre,
      telefono: texto(body.telefono),
      app: texto(body.app),
      direccion: texto(body.direccion),
      cp_frecuente: Number(body.cp_frecuente ?? body.cpFrecuente ?? 0) || null,
      estado_ultimo_pedido: body.estado_ultimo_pedido || body.estadoUltimo || 'pendiente',
      tipo_pago: body.tipo_pago || body.tipoPago || 'Banco',
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/clientes/:id', requirePermission('clientes', 'editar'), async (req, res, next) => {
  try {
    const item = await clientes.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Cliente no encontrado' });
    const body = req.body || {};
    const updated = await clientes.update(item.id_cliente, {
      ...body,
      nombre: texto(body.nombre ?? body.cliente ?? item.nombre),
      cp_frecuente: Number(body.cp_frecuente ?? body.cpFrecuente ?? item.cp_frecuente ?? 0) || null,
      tipo_pago: body.tipo_pago || body.tipoPago || item.tipo_pago,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/clientes/:id', requirePermission('clientes', 'eliminar'), async (req, res, next) => {
  try {
    const item = await clientes.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Cliente no encontrado' });
    await clientes.remove(item.id_cliente);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) { next(err); }
});

export default router;

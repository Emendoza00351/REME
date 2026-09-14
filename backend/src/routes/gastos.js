import { Router } from 'express';
import { gastos, ajustarExistencias } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';
import { texto } from '../utils/validadores.js';

const router = Router();

const esCompra = (body = {}) => (body.tipo_movimiento || body.tipoMovimiento) === 'compra_inventario';

router.get('/gastos', requirePermission('gastos'), async (_req, res, next) => {
  try {
    res.json(await gastos.list({ orderBy: 'id_gasto', desc: true }));
  } catch (err) { next(err); }
});

router.post('/gastos', requirePermission('gastos', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const descripcion = texto(body.descripcion);
    if (!descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });
    if (esCompra(body) && !texto(body.codigo_barras ?? body.codigoBarras)) {
      return res.status(400).json({ error: 'La compra necesita un ID o código de barras' });
    }

    const cantidad = Number(body.cantidad ?? 1);
    const precioUnitario = Number(body.precio_unitario ?? body.precioUnit ?? 0);
    const datos = {
      fecha: body.fecha || new Date().toISOString().slice(0, 10),
      tipo_movimiento: esCompra(body) ? 'compra_inventario' : 'gasto',
      descripcion,
      codigo_barras: texto(body.codigo_barras ?? body.codigoBarras),
      marca: texto(body.marca),
      color: texto(body.color),
      codigo_color: texto(body.codigo_color ?? body.codigoColor),
      tamano: texto(body.tamano),
      total_gramos: Number(body.total_gramos ?? body.totalGramos ?? Number(body.tamano ?? 0) * Number(body.cantidad ?? 0)),
      cantidad,
      unidad: texto(body.unidad) || 'unidad',
      precio_unitario: precioUnitario,
      total: Number(body.total ?? cantidad * precioUnitario),
      estado: body.estado || 'pagado',
      tipo_pago: body.tipo_pago || body.tipoPago || 'efectivo',
    };
    const stock = esCompra(body) ? await ajustarExistencias(datos, cantidad) : null;
    const item = await gastos.insert({ ...datos, id_inventario: stock?.id_inventario ?? null });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/gastos/:id', requirePermission('gastos', 'editar'), async (req, res, next) => {
  try {
    const anterior = await gastos.find(req.params.id);
    if (!anterior) return res.status(404).json({ error: 'Gasto no encontrado' });
    const body = req.body || {};
    const compraNueva = esCompra(body);
    if (compraNueva && !texto(body.codigo_barras ?? body.codigoBarras)) {
      return res.status(400).json({ error: 'La compra necesita un ID o código de barras' });
    }
    if (anterior.tipo_movimiento === 'compra_inventario') {
      await ajustarExistencias(anterior, -Number(anterior.cantidad ?? 0));
    }
    const cantidad = Number(body.cantidad ?? anterior.cantidad ?? 1);
    const precioUnitario = Number(body.precio_unitario ?? body.precioUnit ?? anterior.precio_unitario ?? 0);
    const datos = {
      ...body,
      fecha: body.fecha || anterior.fecha,
      tipo_movimiento: compraNueva ? 'compra_inventario' : 'gasto',
      descripcion: texto(body.descripcion ?? anterior.descripcion),
      codigo_barras: texto(body.codigo_barras ?? body.codigoBarras),
      codigo_color: texto(body.codigo_color ?? body.codigoColor),
      cantidad,
      precio_unitario: precioUnitario,
      total: Number(body.total ?? cantidad * precioUnitario),
      tipo_pago: body.tipo_pago || body.tipoPago || anterior.tipo_pago,
      id_inventario: null,
    };
    const stock = compraNueva ? await ajustarExistencias(datos, cantidad) : null;
    const actualizado = await gastos.update(anterior.id_gasto, { ...datos, id_inventario: stock?.id_inventario ?? null });
    res.json(actualizado);
  } catch (err) { next(err); }
});

router.delete('/gastos/:id', requirePermission('gastos', 'eliminar'), async (req, res, next) => {
  try {
    const item = await gastos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Gasto no encontrado' });
    if (item.tipo_movimiento === 'compra_inventario') await ajustarExistencias(item, -Number(item.cantidad ?? 0));
    await gastos.remove(item.id_gasto);
    res.json({ message: 'Gasto eliminado' });
  } catch (err) { next(err); }
});

export default router;

import { Router } from 'express';
import { pedidos, resolverIdCliente } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';
import { texto } from '../utils/validadores.js';

const router = Router();

const resolverPedido = (body = {}) => {
  const items = Array.isArray(body.items) ? body.items : [];
  const itemResumen = items.map((item) => {
    const nombre = texto(item.producto || item.descripcion || 'Producto');
    const cantidad = Number(item.cantidad ?? 1);
    if (!nombre) return '';
    return `${nombre} x ${cantidad}`;
  }).filter(Boolean).join(', ');

  const totalInput = Number(body.total ?? body.monto_total ?? 0);
  const total = Number.isFinite(totalInput) && totalInput > 0
    ? totalInput
    : items.reduce((sum, item) => {
        const cantidad = Number(item.cantidad ?? 1);
        const precio = Number(item.precio_unidad ?? item.precioUnidad ?? item.precio ?? 0);
        const itemTotal = Number(item.total ?? cantidad * precio ?? 0);
        return sum + itemTotal;
      }, 0);

  return {
    producto: texto(body.producto || itemResumen || 'Pedido mixto'),
    total,
  };
};

router.get('/pedidos', requirePermission('ventas'), async (_req, res, next) => {
  try {
    res.json(await pedidos.list({ orderBy: 'id_pedido' }));
  } catch (err) { next(err); }
});

router.get('/pedidos/:id', requirePermission('ventas'), async (req, res, next) => {
  try {
    const item = await pedidos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/pedidos', requirePermission('ventas', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const cliente = texto(body.cliente);
    if (!cliente) return res.status(400).json({ error: 'Cliente es obligatorio' });

    const pedidoMeta = resolverPedido(body);
    if (!pedidoMeta.producto) return res.status(400).json({ error: 'Debe indicar al menos un producto o una lista de artículos' });

    const tipoPago = body.tipo_pago || body.tipoPago || 'Banco';
    const idCliente = await resolverIdCliente(cliente, tipoPago);

    const item = await pedidos.insert({
      fecha_pedido: body.fecha_pedido || body.fechaPedido || new Date().toISOString().slice(0, 10),
      id_cliente: idCliente,
      cliente,
      cp: Number(body.cp ?? 0),
      producto: pedidoMeta.producto,
      color: texto(body.color),
      descripcion: texto(body.descripcion || (Array.isArray(body.items) ? JSON.stringify(body.items) : '')),
      cantidad: Number(body.cantidad ?? (Array.isArray(body.items) ? body.items.reduce((sum, i) => sum + Number(i.cantidad ?? 1), 0) : 0) ?? 0),
      precio_unidad: Number(body.precio_unidad ?? body.precioUnidad ?? 0),
      total: Number(pedidoMeta.total ?? 0),
      descuento_porcentaje: Number(body.descuento_porcentaje ?? 0),
      adelanto: Number(body.adelanto ?? 0),
      estado_anticipo: body.estado_anticipo === 'pagado' ? 'pagado' : 'pendiente',
      anticipo_metodo_pago: body.anticipo_metodo_pago || null,
      anticipo_banco: texto(body.anticipo_banco),
      tiempo_dias: Number(body.tiempo_dias ?? body.tiempoDias ?? 0),
      fecha_entrega: body.fecha_entrega || body.fechaEntrega || null,
      app: texto(body.app),
      direccion: texto(body.direccion),
      estado: body.estado || 'pendiente',
      tipo_pago: tipoPago,
    });

    const total = Number(item.total ?? 0);
    const adelanto = Number(item.adelanto ?? body.adelanto ?? 0);
    res.status(201).json({
      ...item,
      adelanto,
      saldo_restante: Math.max(total - adelanto, 0),
    });
  } catch (err) { next(err); }
});

router.put('/pedidos/:id', requirePermission('ventas', 'editar'), async (req, res, next) => {
  try {
    const item = await pedidos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });

    const body = req.body || {};
    const datos = { ...body };
    delete datos.id;
    delete datos.saldoRestante;
    delete datos.saldo_restante;
    if (body.adelanto !== undefined) datos.adelanto = Number(body.adelanto ?? 0);

    if (body.cliente !== undefined) {
      const tipoPago = body.tipo_pago || body.tipoPago || item.tipo_pago || 'Banco';
      datos.id_cliente = await resolverIdCliente(body.cliente, tipoPago);
    }

    const updated = await pedidos.update(item.id_pedido, datos);
    const total = Number(updated.total ?? 0);
    const adelanto = Number(updated.adelanto ?? 0);
    res.json({
      ...updated,
      adelanto,
      saldo_restante: Math.max(total - adelanto, 0),
    });
  } catch (err) { next(err); }
});

router.delete('/pedidos/:id', requirePermission('ventas', 'eliminar'), async (req, res, next) => {
  try {
    const item = await pedidos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });
    await pedidos.remove(item.id_pedido);
    res.json({ message: 'Pedido eliminado' });
  } catch (err) { next(err); }
});

router.post('/pedidos/:id/finalizar', requirePermission('ventas', 'editar'), async (req, res, next) => {
  try {
    const item = await pedidos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });
    const updated = await pedidos.update(item.id_pedido, {
      ...item,
      finalizado: true,
      finalizado_en: new Date().toISOString(),
      estado: 'entregado',
    });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;

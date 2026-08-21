import { Router } from 'express';
import { productos, pedidos, inventario, resolverIdCliente } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';

const router = Router();

const texto = (v) => String(v ?? '').trim();

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

router.get('/catalogo', requirePermission('productos'), async (_req, res, next) => {
  try {
    res.json(await productos.list({ orderBy: 'id_producto' }));
  } catch (err) { next(err); }
});

router.get('/productos', requirePermission('productos'), async (_req, res, next) => {
  try {
    res.json(await productos.list({ orderBy: 'id_producto' }));
  } catch (err) { next(err); }
});

router.get('/productos/:id', requirePermission('productos'), async (req, res, next) => {
  try {
    const item = await productos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/productos', requirePermission('productos', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const descripcion = texto(body.descripcion);
    if (!descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });

    const item = await productos.insert({
      cproducto: Number(body.cproducto ?? 0),
      descripcion,
      mano_obra: Number(body.mano_obra ?? body.manoObra ?? 0),
      materiales: Number(body.materiales ?? 0),
      empaque: Number(body.empaque ?? 0),
      otros: Number(body.otros ?? 0),
      costo_materiales: Number(body.costo_materiales ?? body.costoMateriales ?? 0),
      costo_produccion: Number(body.costo_produccion ?? body.costoProduccion ?? 0),
      ganancia: Number(body.ganancia ?? 0),
      precio_venta: Number(body.precio_venta ?? body.precioVenta ?? 0),
      estado: body.estado || 'Activo',
      foto_url: texto(body.foto_url ?? body.fotoUrl ?? 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80'),
    });

    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/productos/:id', requirePermission('productos', 'editar'), async (req, res, next) => {
  try {
    const item = await productos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Producto no encontrado' });

    const updated = await productos.update(item.id_producto, {
      ...item,
      ...req.body,
      mano_obra: Number(req.body?.mano_obra ?? req.body?.manoObra ?? item.mano_obra ?? 0),
      materiales: Number(req.body?.materiales ?? item.materiales ?? 0),
      empaque: Number(req.body?.empaque ?? item.empaque ?? 0),
      otros: Number(req.body?.otros ?? item.otros ?? 0),
      costo_materiales: Number(req.body?.costo_materiales ?? req.body?.costoMateriales ?? item.costo_materiales ?? 0),
      costo_produccion: Number(req.body?.costo_produccion ?? req.body?.costoProduccion ?? item.costo_produccion ?? 0),
      ganancia: Number(req.body?.ganancia ?? item.ganancia ?? 0),
      precio_venta: Number(req.body?.precio_venta ?? req.body?.precioVenta ?? item.precio_venta ?? 0),
      foto_url: texto(req.body?.foto_url ?? req.body?.fotoUrl ?? item.foto_url ?? 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80'),
    });

    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/productos/:id', requirePermission('productos', 'eliminar'), async (req, res, next) => {
  try {
    const item = await productos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Producto no encontrado' });
    await productos.remove(item.id_producto);
    res.json({ message: 'Producto eliminado' });
  } catch (err) { next(err); }
});

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
      tiempo_dias: Number(body.tiempo_dias ?? body.tiempoDias ?? 0),
      fecha_entrega: body.fecha_entrega || body.fechaEntrega || null,
      app: texto(body.app),
      direccion: texto(body.direccion),
      estado: body.estado || 'pendiente',
      tipo_pago: tipoPago,
    });

    const total = Number(item.total ?? 0);
    const adelanto = Number(body.adelanto ?? total * 0.5);
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
    delete datos.adelanto;
    delete datos.saldoRestante;
    delete datos.saldo_restante;

    if (body.cliente !== undefined) {
      const tipoPago = body.tipo_pago || body.tipoPago || item.tipo_pago || 'Banco';
      datos.id_cliente = await resolverIdCliente(body.cliente, tipoPago);
    }

    const updated = await pedidos.update(item.id_pedido, datos);
    const total = Number(updated.total ?? 0);
    const adelanto = Number(body.adelanto ?? total * 0.5);
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

router.get('/facturacion', requirePermission('facturacion'), async (_req, res, next) => {
  try {
    const lista = await pedidos.list({ orderBy: 'id_pedido' });
    const facturas = lista.map((pedido) => {
      const total = Number(pedido.total ?? 0);
      const adelanto = total * 0.5;
      const saldoRestante = Math.max(total - adelanto, 0);

      return {
        id: pedido.id_pedido,
        controlPedido: pedido.id_pedido,
        cliente: pedido.cliente,
        producto: pedido.producto,
        total,
        adelanto,
        saldoRestante,
        tipoPago: pedido.tipo_pago || 'Banco',
        canal: pedido.app || '',
        fechaEntrega: pedido.fecha_entrega || '',
        estadoCobro: saldoRestante <= 0 ? 'cobrado' : 'por cobrar',
      };
    });
    res.json(facturas);
  } catch (err) { next(err); }
});

router.post('/facturacion', requirePermission('facturacion', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const cliente = texto(body.cliente || body.customer || '');
    const producto = texto(body.producto || '');
    if (!cliente || !producto) return res.status(400).json({ error: 'Cliente y producto son obligatorios' });

    const total = Number(body.total ?? 0);
    const adelanto = Number(body.adelanto ?? body.anticipo ?? 0);
    const saldoRestante = Number(body.saldoRestante ?? body.saldo_restante ?? Math.max(total - adelanto, 0));
    const tipoPago = body.tipo_pago || body.tipoPago || 'Banco';
    const idCliente = await resolverIdCliente(cliente, tipoPago);

    const item = await pedidos.insert({
      fecha_pedido: body.fecha_pedido || body.fechaPedido || new Date().toISOString().slice(0, 10),
      id_cliente: idCliente,
      cliente,
      cp: Number(body.cp ?? 0),
      producto,
      color: texto(body.color),
      descripcion: texto(body.descripcion),
      cantidad: Number(body.cantidad ?? 0),
      precio_unidad: Number(body.precio_unidad ?? body.precioUnidad ?? 0),
      total,
      tiempo_dias: Number(body.tiempo_dias ?? body.tiempoDias ?? 0),
      fecha_entrega: body.fecha_entrega || body.fechaEntrega || null,
      app: texto(body.canal || body.app),
      direccion: texto(body.direccion),
      estado: saldoRestante <= 0 ? 'entregado' : 'pendiente',
      tipo_pago: tipoPago,
    });

    res.status(201).json({
      id: item.id_pedido,
      controlPedido: item.id_pedido,
      cliente: item.cliente,
      producto: item.producto,
      total: Number(item.total ?? 0),
      adelanto,
      saldoRestante,
      tipoPago: item.tipo_pago || 'Banco',
      canal: item.app || '',
      fechaEntrega: item.fecha_entrega || '',
      estadoCobro: saldoRestante <= 0 ? 'cobrado' : 'por cobrar',
    });
  } catch (err) { next(err); }
});

router.put('/facturacion/:id', requirePermission('facturacion', 'editar'), async (req, res, next) => {
  try {
    const item = await pedidos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });

    const updated = await pedidos.update(item.id_pedido, {
      cliente: texto(req.body?.cliente ?? item.cliente),
      producto: texto(req.body?.producto ?? item.producto),
      total: Number(req.body?.total ?? item.total ?? 0),
      app: texto(req.body?.canal ?? req.body?.app ?? item.app),
      tipo_pago: req.body?.tipoPago || req.body?.tipo_pago || item.tipo_pago || 'Banco',
      fecha_entrega: req.body?.fecha_entrega || req.body?.fechaEntrega || item.fecha_entrega,
      estado: req.body?.estado || item.estado || 'pendiente',
    });

    res.json({
      id: updated.id_pedido,
      controlPedido: updated.id_pedido,
      cliente: updated.cliente,
      producto: updated.producto,
      total: Number(updated.total ?? 0),
      tipoPago: updated.tipo_pago || 'Banco',
      canal: updated.app || '',
      fechaEntrega: updated.fecha_entrega || '',
      estadoCobro: Number(updated.total ?? 0) > 0 ? 'cobrado' : 'por cobrar',
    });
  } catch (err) { next(err); }
});

router.delete('/facturacion/:id', requirePermission('facturacion', 'eliminar'), async (req, res, next) => {
  try {
    const item = await pedidos.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });
    await pedidos.remove(item.id_pedido);
    res.json({ message: 'Factura eliminada' });
  } catch (err) { next(err); }
});

router.get('/inventario', requirePermission('inventario'), async (_req, res, next) => {
  try {
    res.json(await inventario.list({ orderBy: 'id_inventario' }));
  } catch (err) { next(err); }
});

router.get('/inventario/:id', requirePermission('inventario'), async (req, res, next) => {
  try {
    const item = await inventario.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Inventario no encontrado' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/inventario', requirePermission('inventario', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const marca = texto(body.marca);
    const color = texto(body.color);
    if (!marca || !color) return res.status(400).json({ error: 'Marca y color son obligatorios' });

    const item = await inventario.insert({
      marca,
      color,
      gr_10: Number(body.gr_10 ?? body.gr10 ?? 0),
      gr_50: Number(body.gr_50 ?? body.gr50 ?? 0),
      gr_100: Number(body.gr_100 ?? body.gr100 ?? 0),
      cantidad: Number(body.cantidad ?? 0),
      estado: body.estado || 'Activo',
    });

    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/inventario/:id', requirePermission('inventario', 'editar'), async (req, res, next) => {
  try {
    const item = await inventario.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Inventario no encontrado' });
    const updated = await inventario.update(item.id_inventario, req.body);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/inventario/:id', requirePermission('inventario', 'eliminar'), async (req, res, next) => {
  try {
    const item = await inventario.find(req.params.id);
    if (!item) return res.status(404).json({ error: 'Inventario no encontrado' });
    await inventario.remove(item.id_inventario);
    res.json({ message: 'Inventario eliminado' });
  } catch (err) { next(err); }
});

export default router;

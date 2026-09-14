import { Router } from 'express';
import { pedidos, resolverIdCliente } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';
import { texto } from '../utils/validadores.js';

const router = Router();

router.get('/facturacion', requirePermission('facturacion'), async (_req, res, next) => {
  try {
    const lista = (await pedidos.list({ orderBy: 'id_pedido' })).filter((pedido) => pedido.finalizado);
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
        envioRequerido: !!pedido.envio_requerido,
        costoEnvio: Number(pedido.costo_envio ?? 0),
        estadoPedido: pedido.finalizado ? 'finalizado' : 'pendiente',
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
      adelanto: Number(req.body?.adelanto ?? item.adelanto ?? 0),
      app: texto(req.body?.canal ?? req.body?.app ?? item.app),
      tipo_pago: req.body?.tipoPago || req.body?.tipo_pago || item.tipo_pago || 'Banco',
      fecha_entrega: req.body?.fecha_entrega || req.body?.fechaEntrega || item.fecha_entrega,
      estado: req.body?.estado || item.estado || 'pendiente',
    });

    const total = Number(updated.total ?? 0);
    const adelanto = Number(updated.adelanto ?? 0);
    const saldoRestante = Math.max(total - adelanto, 0);

    res.json({
      id: updated.id_pedido,
      controlPedido: updated.id_pedido,
      cliente: updated.cliente,
      producto: updated.producto,
      total,
      adelanto,
      saldoRestante,
      tipoPago: updated.tipo_pago || 'Banco',
      canal: updated.app || '',
      fechaEntrega: updated.fecha_entrega || '',
      estadoCobro: saldoRestante <= 0 ? 'cobrado' : 'por cobrar',
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

export default router;

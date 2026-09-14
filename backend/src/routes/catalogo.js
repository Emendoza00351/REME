import { Router } from 'express';
import { productos, pedidos, inventario, clientes, gastos, consumosInventario, resolverIdCliente } from '../store/catalogo.js';
import { withTransaction } from '../store/db.js';
import { requirePermission } from '../middleware/permisos.js';

const router = Router();

const texto = (v) => String(v ?? '').trim();

const esCompra = (body = {}) => (body.tipo_movimiento || body.tipoMovimiento) === 'compra_inventario';

function errorConEstado(mensaje, status) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

/**
 * Lee y actualiza el inventario dentro de una transacción con
 * `SELECT ... FOR UPDATE`, para que dos compras/consumos concurrentes del
 * mismo código de barras no lean la misma existencia y dejen el stock
 * inconsistente (una de las dos debe esperar a que la otra libere la fila).
 */
async function ajustarExistencias(datos, delta) {
  const codigoBarras = texto(datos.codigo_barras ?? datos.codigoBarras);
  if (!codigoBarras) throw new Error('La compra para inventario necesita un ID o código de barras');

  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM inventario WHERE codigo_barras = $1 FOR UPDATE', [codigoBarras]);
    const item = rows[0] ?? null;

    if (!item && delta < 0) return null;

    if (!item) {
      const codigoColor = texto(datos.codigo_color ?? datos.codigoColor);
      const insertado = await client.query(
        `INSERT INTO inventario
           (codigo_barras, marca, color, codigo_materia_prima, codigo_color, codigo, tamano, cantidad, gr_10, gr_50, gr_100, estado)
         VALUES ($1, $2, $3, '', $4, $4, $5, $6, 0, 0, 0, 'Activo')
         RETURNING *`,
        [codigoBarras, texto(datos.marca), texto(datos.color), codigoColor, texto(datos.tamano), Math.max(Number(delta), 0)],
      );
      return insertado.rows[0];
    }

    const cantidad = Number(item.cantidad ?? 0) + Number(delta);
    if (cantidad < 0) throw new Error('La reversión dejaría el inventario en negativo');

    const marca = texto(datos.marca || item.marca);
    const color = texto(datos.color || item.color);
    const codigoColor = texto(datos.codigo_color ?? datos.codigoColor ?? item.codigo_color);
    const tamano = texto(datos.tamano || item.tamano);
    const totalGramos = Number(item.tamano ?? datos.tamano ?? 0) * cantidad;

    const actualizado = await client.query(
      `UPDATE inventario
         SET codigo_barras = $1, marca = $2, color = $3, codigo_color = $4, codigo = $4,
             tamano = $5, cantidad = $6, total_gramos = $7, actualizado_en = now()
       WHERE id_inventario = $8
       RETURNING *`,
      [codigoBarras, marca, color, codigoColor, tamano, cantidad, totalGramos, item.id_inventario],
    );
    return actualizado.rows[0];
  });
}

function calcularProducto(body, anterior = {}) {
  const tiempoHoras = Number(body.tiempo_horas ?? body.tiempoHoras ?? anterior.tiempo_horas ?? 0);
  const precioHora = Number(body.precio_hora ?? body.precioHora ?? anterior.precio_hora ?? 0);
  const materiales = Number(body.materiales ?? body.costo_materiales ?? anterior.materiales ?? anterior.costo_materiales ?? 0);
  const empaque = Number(body.empaque ?? anterior.empaque ?? 0);
  const otros = Number(body.otros ?? anterior.otros ?? 0);
  const porcentajeGanancia = Number(String(body.porcentaje_ganancia ?? body.porcentajeGanancia ?? anterior.porcentaje_ganancia ?? 0).replace('%', '')) || 0;
  const manoObra = tiempoHoras * precioHora;
  const costoProduccion = manoObra + materiales + empaque + otros;
  const ganancia = costoProduccion * porcentajeGanancia / 100;

  return {
    tiempo_horas: tiempoHoras,
    precio_hora: precioHora,
    mano_obra: manoObra,
    materiales,
    empaque,
    otros,
    costo_materiales: materiales + empaque,
    costo_produccion: costoProduccion,
    porcentaje_ganancia: porcentajeGanancia,
    ganancia,
    precio_venta: costoProduccion + ganancia,
  };
}

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

router.post('/productos', requirePermission('productos', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const descripcion = texto(body.descripcion);
    if (!descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });
    const existentes = await productos.list({ orderBy: 'cproducto', desc: true });
    const siguienteCodigo = (Number(existentes[0]?.cproducto) || 0) + 1;

    const calculo = calcularProducto(body);
    const item = await productos.insert({
      cproducto: siguienteCodigo,
      descripcion,
      tamano_cm: Number(body.tamano_cm ?? body.tamanoCm ?? 0),
      ...calculo,
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

    const calculo = calcularProducto(req.body ?? {}, item);
    const updated = await productos.update(item.id_producto, {
      ...item,
      ...req.body,
      cproducto: item.cproducto,
      tamano_cm: Number(req.body?.tamano_cm ?? req.body?.tamanoCm ?? item.tamano_cm ?? 0),
      ...calculo,
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

router.get('/resultados/resumen', requirePermission('resultados'), async (_req, res, next) => {
  try {
    const [listaPedidos, listaGastos] = await Promise.all([
      pedidos.list({ orderBy: 'id_pedido' }),
      gastos.list({ orderBy: 'id_gasto' }),
    ]);
    const finalizados = listaPedidos.filter((pedido) => pedido.finalizado);
    const ingresosVentas = finalizados.reduce((sum, pedido) => sum + Number(pedido.total ?? 0) + Number(pedido.costo_envio ?? 0), 0);
    const anticipos = finalizados.reduce((sum, pedido) => sum + Number(pedido.adelanto ?? 0), 0);
    const gastosTotal = listaGastos.reduce((sum, gasto) => sum + Number(gasto.total ?? 0), 0);
    res.json({
      ingresosVentas,
      anticipos,
      cuentasPorCobrar: Math.max(ingresosVentas - anticipos, 0),
      egresos: gastosTotal,
      gananciaEstimada: ingresosVentas - gastosTotal,
      pedidosFinalizados: finalizados.length,
      gastosRegistrados: listaGastos.length,
    });
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

router.get('/consumos', requirePermission('inventario'), async (_req, res, next) => {
  try {
    res.json(await consumosInventario.list({ orderBy: 'id_consumo', desc: true }));
  } catch (err) { next(err); }
});

router.post('/consumos', requirePermission('inventario', 'crear'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const codigoBarras = texto(body.codigo_barras ?? body.codigoBarras);
    const producto = texto(body.producto);
    const pesoInicial = Number(body.peso_inicial ?? body.pesoInicial ?? 0);
    const pesoFinal = Number(body.peso_final ?? body.pesoFinal ?? 0);
    if (!codigoBarras || !producto || pesoInicial <= 0 || pesoFinal < 0 || pesoFinal > pesoInicial) {
      return res.status(400).json({ error: 'Completa el ID, producto y pesos válidos. El peso final no puede superar al inicial.' });
    }

    /* Todo el chequeo de existencia + descuento va en una sola transacción con
       SELECT ... FOR UPDATE: sin esto, dos consumos concurrentes del mismo
       material podían leer la misma existencia y ambos pasar la validación,
       dejando el inventario en negativo. */
    const resultado = await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM inventario WHERE codigo_barras = $1 FOR UPDATE', [codigoBarras]);
      const material = rows[0];
      if (!material) throw errorConEstado('No existe un material con ese ID', 404);

      const tamanoRollo = Number(material.tamano ?? 0);
      if (tamanoRollo <= 0) throw errorConEstado('El material no tiene tamaño en gramos configurado', 400);

      const pesoConsumido = pesoInicial - pesoFinal;
      const rollosConsumidos = pesoConsumido / tamanoRollo;
      if (rollosConsumidos <= 0) throw errorConEstado('El peso consumido debe ser mayor que cero', 400);

      const existencia = Number(material.cantidad ?? 0);
      if (existencia < rollosConsumidos) throw errorConEstado(`Inventario insuficiente. Disponible: ${existencia}`, 400);

      const actualizado = await client.query(
        'UPDATE inventario SET cantidad = $1, actualizado_en = now() WHERE id_inventario = $2 RETURNING *',
        [existencia - rollosConsumidos, material.id_inventario],
      );

      const insertado = await client.query(
        `INSERT INTO consumos_inventario
           (fecha, id_inventario, codigo_barras, codigo_pedido, producto, color, peso_inicial, peso_final, peso_consumido, unidades_producidas, rollos_consumidos, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          body.fecha || new Date().toISOString().slice(0, 10),
          actualizado.rows[0].id_inventario,
          codigoBarras,
          Number(body.codigo_pedido ?? body.codigoPedido) || null,
          producto,
          texto(body.color),
          pesoInicial,
          pesoFinal,
          pesoConsumido,
          Number(body.unidades_producidas ?? body.unidadesProducidas ?? 0),
          rollosConsumidos,
          texto(body.observacion),
        ],
      );

      return { consumo: insertado.rows[0], inventarioRestante: actualizado.rows[0].cantidad };
    });

    res.status(201).json({ ...resultado.consumo, inventario_restante: resultado.inventarioRestante });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.delete('/consumos/:id', requirePermission('inventario', 'eliminar'), async (req, res, next) => {
  try {
    const consumo = await consumosInventario.find(req.params.id);
    if (!consumo) return res.status(404).json({ error: 'Consumo no encontrado' });

    await withTransaction(async (client) => {
      if (consumo.id_inventario) {
        await client.query('SELECT * FROM inventario WHERE id_inventario = $1 FOR UPDATE', [consumo.id_inventario]);
        await client.query(
          'UPDATE inventario SET cantidad = cantidad + $1, actualizado_en = now() WHERE id_inventario = $2',
          [Number(consumo.rollos_consumidos ?? 0), consumo.id_inventario],
        );
      }
      await client.query('DELETE FROM consumos_inventario WHERE id_consumo = $1', [consumo.id_consumo]);
    });

    res.json({ message: 'Consumo eliminado e inventario restaurado' });
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
      codigo_barras: texto(body.codigo_barras ?? body.codigoBarras),
      marca,
      color,
      codigo_materia_prima: texto(body.codigo_materia_prima ?? body.codigoMateriaPrima ?? body.codigo),
      codigo_color: texto(body.codigo_color ?? body.codigoColor),
      codigo: texto(body.codigo),
      tamano: texto(body.tamano),
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
    const body = req.body || {};
    const updated = await inventario.update(item.id_inventario, {
      ...body,
      codigo_barras: texto(body.codigo_barras ?? body.codigoBarras ?? item.codigo_barras),
      codigo_materia_prima: texto(body.codigo_materia_prima ?? body.codigoMateriaPrima ?? item.codigo_materia_prima ?? item.codigo),
      codigo_color: texto(body.codigo_color ?? body.codigoColor ?? item.codigo_color),
      codigo: texto(body.codigo ?? item.codigo),
      tamano: texto(body.tamano ?? item.tamano),
      total_gramos: Number(body.total_gramos ?? body.totalGramos ?? Number(body.tamano ?? item.tamano ?? 0) * Number(body.cantidad ?? item.cantidad ?? 0)),
    });
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

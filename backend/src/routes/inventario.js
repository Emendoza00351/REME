import { Router } from 'express';
import { inventario, consumosInventario, errorConEstado } from '../store/catalogo.js';
import { withTransaction } from '../store/db.js';
import { requirePermission } from '../middleware/permisos.js';
import { texto } from '../utils/validadores.js';

const router = Router();

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

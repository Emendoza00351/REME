import { Router } from 'express';
import { productos } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';
import { texto } from '../utils/validadores.js';

const router = Router();

const FOTO_POR_DEFECTO = 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80';

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
    const existentes = await productos.list({ orderBy: 'cproducto', desc: true });
    const siguienteCodigo = (Number(existentes[0]?.cproducto) || 0) + 1;

    const calculo = calcularProducto(body);
    const item = await productos.insert({
      cproducto: siguienteCodigo,
      descripcion,
      tamano_cm: Number(body.tamano_cm ?? body.tamanoCm ?? 0),
      ...calculo,
      estado: body.estado || 'Activo',
      foto_url: texto(body.foto_url ?? body.fotoUrl ?? FOTO_POR_DEFECTO),
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
      foto_url: texto(req.body?.foto_url ?? req.body?.fotoUrl ?? item.foto_url ?? FOTO_POR_DEFECTO),
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

export default router;

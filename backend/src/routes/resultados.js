import { Router } from 'express';
import { pedidos, gastos } from '../store/catalogo.js';
import { requirePermission } from '../middleware/permisos.js';

const router = Router();

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

export default router;

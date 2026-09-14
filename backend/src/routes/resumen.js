import { Router } from 'express';
import { productos, pedidos, inventario, clientes, gastos } from '../store/catalogo.js';
import { puede, resolverRol } from '../middleware/permisos.js';

const router = Router();

/* Tarjetas del panel de inicio (ResumenGeneral en el frontend). Cada una
   requiere el mismo permiso "ver" que su módulo completo, así que un
   VENDEDOR sin acceso a productos no recibe ese conteo — el frontend igual
   filtra las tarjetas por permiso, pero conviene no enviar de más. */
router.get('/resumen', async (req, res, next) => {
  try {
    const idRol = resolverRol(req);
    if (idRol == null) return res.status(401).json({ error: 'No autenticado' });

    const datos = {};

    if (puede(idRol, 'gastos', 'ver')) {
      datos.gastos = await gastos.count();
    }
    if (puede(idRol, 'ventas', 'ver')) {
      datos.ventas = await pedidos.count();
    }
    if (puede(idRol, 'facturacion', 'ver')) {
      const lista = await pedidos.list({ orderBy: 'id_pedido' });
      datos.facturacion = lista.filter((p) => p.finalizado).length;
    }
    if (puede(idRol, 'clientes', 'ver')) {
      datos.clientes = await clientes.count();
    }
    if (puede(idRol, 'productos', 'ver')) {
      datos.productos = await productos.count();
    }
    if (puede(idRol, 'inventario', 'ver')) {
      datos.inventario = await inventario.count();
    }
    if (puede(idRol, 'resultados', 'ver')) {
      const [listaPedidos, listaGastos] = await Promise.all([
        pedidos.list({ orderBy: 'id_pedido' }),
        gastos.list({ orderBy: 'id_gasto' }),
      ]);
      const ingresosVentas = listaPedidos
        .filter((p) => p.finalizado)
        .reduce((sum, p) => sum + Number(p.total ?? 0) + Number(p.costo_envio ?? 0), 0);
      const gastosTotal = listaGastos.reduce((sum, g) => sum + Number(g.total ?? 0), 0);
      datos.resultados = ingresosVentas - gastosTotal;
    }

    res.json(datos);
  } catch (err) { next(err); }
});

export default router;

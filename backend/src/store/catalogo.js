import { createTable, withTransaction } from './db.js';
import { texto } from '../utils/validadores.js';

export const productos = createTable('productos', 'id_producto');
export const pedidos = createTable('pedidos', 'id_pedido');
export const inventario = createTable('inventario', 'id_inventario');
export const clientes = createTable('clientes', 'id_cliente');
export const gastos = createTable('gastos', 'id_gasto');
export const consumosInventario = createTable('consumos_inventario', 'id_consumo');

export function errorConEstado(mensaje, status) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

/**
 * Lee y actualiza el inventario dentro de una transacción con
 * `SELECT ... FOR UPDATE`, para que dos compras/consumos concurrentes del
 * mismo código de barras no lean la misma existencia y dejen el stock
 * inconsistente (una de las dos debe esperar a que la otra libere la fila).
 * La usan tanto /gastos (compra_inventario) como /consumos.
 */
export async function ajustarExistencias(datos, delta) {
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

/**
 * El formulario de Pedidos todavía pide el nombre del cliente como texto
 * libre (no hay selector contra el módulo Clientes), pero `pedidos.id_cliente`
 * es una FK NOT NULL real — así que se resuelve por nombre: si ya existe un
 * cliente con ese nombre se reutiliza, si no se crea uno mínimo al vuelo.
 */
export async function resolverIdCliente(nombreCliente, tipoPago) {
  const nombre = String(nombreCliente ?? '').trim();
  if (!nombre) return null;

  const existente = await clientes.findBy('nombre', nombre);
  if (existente) return existente.id_cliente;

  const creado = await clientes.insert({ nombre, tipo_pago: tipoPago || 'Banco' });
  return creado.id_cliente;
}

export async function seedCatalogoSiVacio() {
  if ((await clientes.count()) === 0) {
    await clientes.insert({ nombre: 'Joeni', tipo_pago: 'Banco' });
    await clientes.insert({ nombre: 'Lizzy', tipo_pago: 'Banco' });
  }

  if ((await productos.count()) === 0) {
    await productos.insert({
      cproducto: 1, descripcion: 'Tulipa', mano_obra: 25, materiales: 15, empaque: 21, otros: 0,
      costo_materiales: 36, costo_produccion: 61, ganancia: 99, precio_venta: 160, estado: 'Activo',
      foto_url: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80',
    });
    await productos.insert({
      cproducto: 2, descripcion: 'Rosa', mano_obra: 28, materiales: 18, empaque: 22, otros: 0,
      costo_materiales: 40, costo_produccion: 70, ganancia: 110, precio_venta: 180, estado: 'Activo',
      foto_url: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=900&q=80',
    });
  }

  if ((await pedidos.count()) === 0) {
    const joeni = await clientes.findBy('nombre', 'Joeni');
    const lizzy = await clientes.findBy('nombre', 'Lizzy');

    await pedidos.insert({
      fecha_pedido: '2026-08-01', id_cliente: joeni.id_cliente, cliente: 'Joeni', cp: 1,
      producto: 'Tulipanes', color: 'vários', descripcion: 'rojo, rosado, blanco',
      cantidad: 6, precio_unidad: 160, total: 960, tiempo_dias: 38, fecha_entrega: '2026-08-25',
      app: 'Wapp', direccion: '', estado: 'entregado', tipo_pago: 'Banco',
    });
    await pedidos.insert({
      fecha_pedido: '2026-08-08', id_cliente: lizzy.id_cliente, cliente: 'Lizzy', cp: 83,
      producto: 'Fundas para audífonos', color: 'Cerezas', descripcion: 'Ver foto w app',
      cantidad: 1, precio_unidad: 623.33, total: 623.33, tiempo_dias: 15, fecha_entrega: '2026-08-23',
      app: 'personal', direccion: '', estado: 'pendiente', tipo_pago: 'Banco',
    });
  }

  if ((await inventario.count()) === 0) {
    await inventario.insert({ marca: 'IMPROTECA', color: 'GRIS', gr_10: 8, gr_50: 0, gr_100: 0, cantidad: 8, estado: 'Activo' });
    await inventario.insert({ marca: 'IMPROTECA', color: 'MORADO OSCURO', gr_10: 5, gr_50: 0, gr_100: 0, cantidad: 5, estado: 'Activo' });
  }
}

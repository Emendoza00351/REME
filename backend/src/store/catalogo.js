import { createTable } from './db.js';

export const productos = createTable('productos', 'id_producto');
export const pedidos = createTable('pedidos', 'id_pedido');
export const inventario = createTable('inventario', 'id_inventario');
export const clientes = createTable('clientes', 'id_cliente');

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

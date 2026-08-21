import { createTable } from './db.js';
import { hashPassword } from '../utils/password.js';

export const roles = createTable('roles', 'id_rol');
export const empleados = createTable('empleados', 'id_empleado');
export const usuarios = createTable('usuarios', 'id_usuario');

/**
 * Datos de arranque — solo se insertan si la tabla está vacía, así que correr
 * el backend muchas veces no duplica nada. Antes esto vivía hardcodeado en
 * memoria; ahora es la carga inicial real de la base "reme".
 */
export async function seedBaseSiVacio() {
  if ((await roles.count()) === 0) {
    await roles.insert({ nombre: 'ADMIN', descripcion: 'Acceso total al sistema', estado: 'Activo' });
    await roles.insert({ nombre: 'GERENTE', descripcion: 'Operación y análisis, sin seguridad', estado: 'Activo' });
    await roles.insert({ nombre: 'VENDEDOR', descripcion: 'Ventas y clientes', estado: 'Activo' });
  }

  if ((await empleados.count()) === 0) {
    await empleados.insert({
      dni: '0801-1995-01234', nombre: 'REMEDIOS MENDOZA', telefono: '9876-5432',
      correo: 'reme@remecrochet.hn', cargo: 'PROPIETARIA', estado: 'Activo', fecha_ingreso: '2024-01-15',
    });
    await empleados.insert({
      dni: '0801-1998-04567', nombre: 'ANA LOPEZ', telefono: '9123-4567',
      correo: 'ana@remecrochet.hn', cargo: 'ARTESANA', estado: 'Activo', fecha_ingreso: '2025-03-01',
    });
  }

  if ((await usuarios.count()) === 0) {
    const rolAdmin = await roles.findBy('nombre', 'ADMIN');
    const rolVendedor = await roles.findBy('nombre', 'VENDEDOR');
    const empReme = await empleados.findBy('nombre', 'REMEDIOS MENDOZA');
    const empAna = await empleados.findBy('nombre', 'ANA LOPEZ');

    await usuarios.insert({
      usuario: 'admin', nombre: 'REMEDIOS MENDOZA', correo: 'reme@remecrochet.hn',
      id_empleado: empReme.id_empleado, id_rol: rolAdmin.id_rol, estado: 'Activo',
      password_hash: hashPassword('admin123'),
    });
    await usuarios.insert({
      usuario: 'ana', nombre: 'ANA LOPEZ', correo: 'ana@remecrochet.hn',
      id_empleado: empAna.id_empleado, id_rol: rolVendedor.id_rol, estado: 'Activo',
      password_hash: hashPassword('ana123'),
    });
    /* Usuario de prueba: acceso ADMIN completo mientras no hay altas reales. */
    await usuarios.insert({
      usuario: 'demo', nombre: 'DEMO', correo: 'demo@remecrochet.hn',
      id_empleado: null, id_rol: rolAdmin.id_rol, estado: 'Activo',
      password_hash: hashPassword('reme2026'),
    });
  }
}

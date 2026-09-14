export type ModuleKey =
  | 'gastos'
  | 'ventas'
  | 'facturacion'
  | 'clientes'
  | 'productos'
  | 'catalogo'
  | 'inventario'
  | 'consumos'
  | 'resultados'
  | 'empleados'
  | 'usuarios'
  | 'roles'
  | 'auditoria'
export type ModuleAction = 'table' | 'new'

export type ModuleCommand = {
  id: number
  action: ModuleAction
}

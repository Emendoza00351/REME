export type ModuleKey =
  | 'gastos'
  | 'ventas'
  | 'facturacion'
  | 'clientes'
  | 'codigos'
  | 'productos'
  | 'catalogo'
  | 'inventario'
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

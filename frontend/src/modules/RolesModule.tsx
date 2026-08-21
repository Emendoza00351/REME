import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, nombre: 'ADMIN', descripcion: 'Acceso total al sistema', usuarios: 2, estado: 'Activo' },
  { id: 2, nombre: 'GERENTE', descripcion: 'Operacion y analisis, sin seguridad', usuarios: 0, estado: 'Activo' },
  { id: 3, nombre: 'VENDEDOR', descripcion: 'Ventas y clientes', usuarios: 1, estado: 'Activo' },
]

export default function RolesModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_rol ?? 0),
    nombre: row.nombre ?? '',
    descripcion: row.descripcion ?? '',
    usuarios: Number(row.usuarios ?? 0),
    estado: row.estado ?? 'Activo',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    nombre: payload.nombre,
    descripcion: payload.descripcion,
    estado: payload.estado,
  })

  return (
    <CrudModule
      moduleKey="roles"
      title="Panel de Roles"
      subtitle="Roles del sistema y cuántos usuarios tiene cada uno"
      command={command}
      apiUrl="/api/roles"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Nombre', key: 'nombre' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Usuarios', key: 'usuarios' },
        { label: 'Estado', key: 'estado' },
      ]}
      formFields={[
        { key: 'nombre', label: 'Nombre del rol', type: 'text', required: true },
        { key: 'descripcion', label: 'Descripcion', type: 'text', required: false },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

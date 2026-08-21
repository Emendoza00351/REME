import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, dni: '0801-1995-01234', nombre: 'REMEDIOS MENDOZA', telefono: '9876-5432', correo: 'reme@remecrochet.hn', cargo: 'PROPIETARIA', estado: 'Activo', fechaIngreso: '2024-01-15' },
  { id: 2, dni: '0801-1998-04567', nombre: 'ANA LOPEZ', telefono: '9123-4567', correo: 'ana@remecrochet.hn', cargo: 'ARTESANA', estado: 'Activo', fechaIngreso: '2025-03-01' },
]

export default function EmpleadosModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_empleado ?? 0),
    dni: row.dni ?? '',
    nombre: row.nombre ?? '',
    telefono: row.telefono ?? '',
    correo: row.correo ?? '',
    cargo: row.cargo ?? '',
    estado: row.estado ?? 'Activo',
    fechaIngreso: row.fecha_ingreso ?? row.fechaIngreso ?? '',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    dni: payload.dni,
    nombre: payload.nombre,
    telefono: payload.telefono,
    correo: payload.correo,
    cargo: payload.cargo,
    estado: payload.estado,
    fecha_ingreso: payload.fechaIngreso,
  })

  return (
    <CrudModule
      moduleKey="empleados"
      title="Panel de Empleados"
      subtitle="Ficha de personal — identidad, contacto y cargo"
      command={command}
      apiUrl="/api/empleados"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'DNI', key: 'dni' },
        { label: 'Nombre', key: 'nombre' },
        { label: 'Telefono', key: 'telefono' },
        { label: 'Correo', key: 'correo' },
        { label: 'Cargo', key: 'cargo' },
        { label: 'Fecha ingreso', key: 'fechaIngreso' },
        { label: 'Estado', key: 'estado' },
      ]}
      formFields={[
        { key: 'dni', label: 'DNI (0000-0000-00000)', type: 'text', required: true },
        { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'telefono', label: 'Telefono', type: 'text', required: false },
        { key: 'correo', label: 'Correo', type: 'text', required: false },
        { key: 'cargo', label: 'Cargo', type: 'text', required: false },
        { key: 'fechaIngreso', label: 'Fecha de ingreso', type: 'date', required: false },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

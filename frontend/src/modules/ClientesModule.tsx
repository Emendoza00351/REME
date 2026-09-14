import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, cliente: 'joeni', telefono: 'NA', app: '', direccion: '', cpFrecuente: 1, estadoUltimo: 'entregado', tipoPago: 'Banco' },
  { id: 2, cliente: 'alejandra', telefono: 'NA', app: 'personal', direccion: '', cpFrecuente: 80, estadoUltimo: 'pendiente', tipoPago: 'Banco' },
  { id: 3, cliente: 'Carlos Torres', telefono: 'NA', app: 'Wapp', direccion: '', cpFrecuente: 81, estadoUltimo: 'entregado', tipoPago: 'Banco' },
  { id: 4, cliente: 'lizzy', telefono: 'NA', app: 'personal', direccion: '', cpFrecuente: 83, estadoUltimo: 'pendiente', tipoPago: 'Banco' },
]

export default function ClientesModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_cliente ?? 0),
    cliente: row.nombre ?? row.cliente ?? '',
    telefono: row.telefono ?? 'NA',
    app: row.app ?? '',
    direccion: row.direccion ?? '',
    cpFrecuente: Number(row.cp_frecuente ?? row.cpFrecuente ?? 0),
    estadoUltimo: row.estado_ultimo_pedido ?? row.estadoUltimo ?? 'pendiente',
    tipoPago: row.tipo_pago ?? row.tipoPago ?? 'Banco',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    nombre: payload.cliente,
    telefono: payload.telefono,
    app: payload.app,
    direccion: payload.direccion,
    cp_frecuente: Number(payload.cpFrecuente ?? 0) || null,
    estado_ultimo_pedido: payload.estadoUltimo,
    tipo_pago: payload.tipoPago,
  })

  return (
    <CrudModule
      moduleKey="clientes"
      title="Panel de Clientes"
      subtitle="Directorio comercial derivado de la hoja VENTAS"
      command={command}
      apiUrl="/api/clientes"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Cliente', key: 'cliente' },
        { label: 'Telefono', key: 'telefono' },
        { label: 'Canal App', key: 'app' },
        { label: 'Direccion', key: 'direccion' },
        { label: 'C.P frecuente', key: 'cpFrecuente' },
        { label: 'Ultimo estado', key: 'estadoUltimo' },
        { label: 'Tipo pago', key: 'tipoPago' },
      ]}
      formFields={[
        { key: 'cliente', label: 'Nombre cliente', type: 'text', required: true },
        { key: 'telefono', label: 'Telefono', type: 'text', required: false },
        { key: 'app', label: 'Canal App', type: 'select', options: ['Wapp', 'TikTok', 'personal', ''], required: false },
        { key: 'direccion', label: 'Direccion', type: 'text', required: false },
        { key: 'cpFrecuente', label: 'Codigo producto frecuente', type: 'number', required: false },
        { key: 'estadoUltimo', label: 'Estado ultimo pedido', type: 'select', options: ['entregado', 'pendiente'], required: true },
        { key: 'tipoPago', label: 'Tipo de pago', type: 'select', options: ['Banco', 'Efectivo'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

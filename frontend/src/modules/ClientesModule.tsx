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
  return (
    <CrudModule
      moduleKey="clientes"
      title="Panel de Clientes"
      subtitle="Directorio comercial derivado de la hoja VENTAS"
      command={command}
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

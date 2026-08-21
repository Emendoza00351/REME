import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, no: 1, fecha: '', descripcion: 'compra de lanilla', cantidad: 1, unidad: 'unidad', precioUnit: 1900, total: 1900, estado: 'por pagar', tipoPago: 'banco' },
  { id: 2, no: 1, fecha: '', descripcion: 'compra de lanilla', cantidad: 1, unidad: 'unidad', precioUnit: 1015, total: 1015, estado: 'por pagar', tipoPago: 'banco' },
  { id: 3, no: 2, fecha: '', descripcion: 'envio', cantidad: 1, unidad: 'unidad', precioUnit: 100, total: 100, estado: 'pagado', tipoPago: 'banco' },
  { id: 4, no: 3, fecha: '', descripcion: 'Inversion lanillas', cantidad: 1, unidad: 'Paquete', precioUnit: 3600, total: 3600, estado: 'pagado', tipoPago: 'banco' },
]

export default function GastosModule({ command, rows }: { command: ModuleCommand; rows?: RowRecord[] }) {
  const sourceRows = rows && rows.length > 0 ? rows : DEFAULT_ROWS

  return (
    <CrudModule
      moduleKey="gastos"
      title="Panel de Gastos"
      subtitle="Control de costos operativos y compra de materiales"
      command={command}
      tableColumns={[
        { label: 'No.', key: 'no' },
        { label: 'Fecha', key: 'fecha' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Cantidad', key: 'cantidad' },
        { label: 'Unidad', key: 'unidad' },
        { label: 'Precio Unt', key: 'precioUnit' },
        { label: 'Total', key: 'total' },
        { label: 'Estado', key: 'estado' },
        { label: 'Tipo de pago', key: 'tipoPago' },
      ]}
      formFields={[
        { key: 'no', label: 'No.', type: 'number', required: true },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'descripcion', label: 'Descripcion', type: 'text', required: true },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
        { key: 'unidad', label: 'Unidad', type: 'select', options: ['unidad', 'Paquete', 'Pago'], required: true },
        { key: 'precioUnit', label: 'Precio unt', type: 'number', required: true },
        { key: 'total', label: 'Total', type: 'number', required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: ['pagado', 'por pagar'], required: true },
        { key: 'tipoPago', label: 'Tipo de pago', type: 'select', options: ['banco', 'efectivo'], required: true },
      ]}
      initialRows={sourceRows}
    />
  )
}

import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, marca: 'IMPROTECA', color: 'GRIS', gr10: 8, gr50: 0, gr100: 0, cantidad: 8 },
  { id: 2, marca: 'IMPROTECA', color: 'MORADO OSCURO', gr10: 5, gr50: 0, gr100: 0, cantidad: 5 },
  { id: 3, marca: 'DETODO', color: 'AZUL MARINO', gr10: 0, gr50: 0, gr100: 1, cantidad: 1 },
  { id: 4, marca: 'DOLLY', color: 'AZUL CIELO', gr10: 0, gr50: 0, gr100: 0.5, cantidad: 0.5 },
  { id: 5, marca: 'IMPROTECA', color: 'BLANCO', gr10: 9, gr50: 0, gr100: 0, cantidad: 9 },
]

export default function InventarioModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_inventario ?? 0),
    marca: row.marca ?? '',
    color: row.color ?? '',
    gr10: Number(row.gr_10 ?? row.gr10 ?? 0),
    gr50: Number(row.gr_50 ?? row.gr50 ?? 0),
    gr100: Number(row.gr_100 ?? row.gr100 ?? 0),
    cantidad: Number(row.cantidad ?? 0),
    estado: row.estado ?? 'Activo',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    marca: payload.marca,
    color: payload.color,
    gr_10: Number(payload.gr10 ?? 0),
    gr_50: Number(payload.gr50 ?? 0),
    gr_100: Number(payload.gr100 ?? 0),
    cantidad: Number(payload.cantidad ?? 0),
    estado: payload.estado ?? 'Activo',
  })

  return (
    <CrudModule
      moduleKey="inventario"
      title="Panel de Inventario"
      subtitle="Stock de hilos y materiales de la hoja INVENTARIO"
      command={command}
      apiUrl="/api/inventario"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Marca', key: 'marca' },
        { label: 'Color', key: 'color' },
        { label: '10 g', key: 'gr10' },
        { label: '50 g', key: 'gr50' },
        { label: '100 g', key: 'gr100' },
        { label: 'Cantidad', key: 'cantidad' },
      ]}
      formFields={[
        { key: 'marca', label: 'Marca', type: 'text', required: true },
        { key: 'color', label: 'Color', type: 'text', required: true },
        { key: 'gr10', label: '10 g', type: 'number', required: false },
        { key: 'gr50', label: '50 g', type: 'number', required: false },
        { key: 'gr100', label: '100 g', type: 'number', required: false },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

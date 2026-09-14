import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, codigoBarras: '750100000001', marca: 'IMPROTECA', color: 'GRIS', codigoColor: 'GR-01', tamano: 10, cantidad: 8, totalGramos: 80 },
  { id: 2, codigoBarras: '750100000002', marca: 'IMPROTECA', color: 'MORADO OSCURO', codigoColor: 'MO-01', tamano: 10, cantidad: 5, totalGramos: 50 },
  { id: 3, codigoBarras: '750100000003', marca: 'DETODO', color: 'AZUL MARINO', codigoColor: 'AM-01', tamano: 100, cantidad: 1, totalGramos: 100 },
  { id: 4, codigoBarras: '750100000004', marca: 'DOLLY', color: 'AZUL CIELO', codigoColor: 'AC-01', tamano: 100, cantidad: 0.5, totalGramos: 50 },
  { id: 5, codigoBarras: '750100000005', marca: 'IMPROTECA', color: 'BLANCO', codigoColor: 'BL-01', tamano: 10, cantidad: 9, totalGramos: 90 },
]

export default function InventarioModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_inventario ?? 0),
    codigoBarras: row.codigo_barras ?? row.codigoBarras ?? '',
    marca: row.marca ?? '',
    color: row.color ?? '',
    codigoColor: row.codigo_color ?? row.codigoColor ?? '',
    tamano: Number(row.tamano ?? row.tamano_cm ?? 0),
    cantidad: Number(row.cantidad ?? 0),
    totalGramos: Number(row.total_gramos ?? row.totalGramos ?? Number(row.tamano ?? row.tamano_cm ?? 0) * Number(row.cantidad ?? 0)),
    estado: row.estado ?? 'Activo',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    codigo_barras: String(payload.codigoBarras ?? ''),
    marca: payload.marca,
    color: payload.color,
    codigo_color: String(payload.codigoColor ?? ''),
    tamano: Number(payload.tamano ?? 0),
    cantidad: Number(payload.cantidad ?? 0),
    total_gramos: Number(payload.totalGramos ?? Number(payload.tamano ?? 0) * Number(payload.cantidad ?? 0)),
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
        { label: 'ID', key: 'codigoBarras' },
        { label: 'Marca', key: 'marca' },
        { label: 'Color', key: 'color' },
        { label: 'Código color', key: 'codigoColor' },
        { label: 'Tamaño (gramos)', key: 'tamano' },
        { label: 'Cantidad', key: 'cantidad' },
        { label: 'Total de gramos', key: 'totalGramos' },
      ]}
      formFields={[
        { key: 'codigoBarras', label: 'ID', type: 'barcode', required: true },
        { key: 'marca', label: 'Marca', type: 'text', required: true },
        { key: 'color', label: 'Color', type: 'text', required: true },
        { key: 'codigoColor', label: 'Código de color', type: 'text', required: true },
        { key: 'tamano', label: 'Tamaño (gramos)', type: 'number', required: true },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
        { key: 'totalGramos', label: 'Total de gramos', type: 'number', required: false, readOnly: true },
      ]}
      initialRows={DEFAULT_ROWS}
      deriveForm={(form) => ({
        totalGramos: (Number(form.tamano || 0) * Number(form.cantidad || 0)).toFixed(2),
      })}
    />
  )
}

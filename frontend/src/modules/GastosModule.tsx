import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, fecha: '', tipoMovimiento: 'gasto', descripcion: 'envio', cantidad: 1, unidad: 'unidad', precioUnit: 100, total: 100, estado: 'pagado', tipoPago: 'banco' },
  { id: 2, fecha: '', tipoMovimiento: 'compra_inventario', descripcion: 'compra de lanilla', cantidad: 1, unidad: 'unidad', precioUnit: 1900, total: 1900, estado: 'por pagar', tipoPago: 'banco', codigoBarras: '750100000001' },
]

export default function GastosModule({ command, rows }: { command: ModuleCommand; rows?: RowRecord[] }) {
  const sourceRows = rows && rows.length > 0 ? rows : DEFAULT_ROWS
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_gasto ?? 0),
    fecha: row.fecha ?? '',
    tipoMovimiento: row.tipo_movimiento ?? row.tipoMovimiento ?? 'gasto',
    descripcion: row.descripcion ?? '',
    codigoBarras: row.codigo_barras ?? row.codigoBarras ?? '',
    marca: row.marca ?? '',
    color: row.color ?? '',
    codigoColor: row.codigo_color ?? row.codigoColor ?? '',
    tamano: Number(row.tamano ?? 0),
    cantidad: Number(row.cantidad ?? 0),
    unidad: row.unidad ?? 'unidad',
    precioUnit: Number(row.precio_unitario ?? row.precioUnit ?? 0),
    total: Number(row.total ?? 0),
    estado: row.estado ?? 'pagado',
    tipoPago: row.tipo_pago ?? row.tipoPago ?? 'efectivo',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    fecha: payload.fecha,
    tipo_movimiento: payload.tipoMovimiento,
    descripcion: payload.descripcion,
    codigo_barras: payload.codigoBarras,
    marca: payload.marca,
    color: payload.color,
    codigo_color: payload.codigoColor,
    tamano: Number(payload.tamano ?? 0),
    cantidad: Number(payload.cantidad ?? 0),
    unidad: payload.unidad,
    precio_unitario: Number(payload.precioUnit ?? 0),
    total: Number(payload.total ?? 0),
    estado: payload.estado,
    tipo_pago: payload.tipoPago,
  })

  const esCompra = (form: Record<string, string>) => form.tipoMovimiento === 'compra_inventario'

  return (
    <CrudModule
      moduleKey="gastos"
      title="Panel de Gastos"
      subtitle="Gastos operativos y compras que alimentan Inventario"
      command={command}
      apiUrl="/api/gastos"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Fecha', key: 'fecha' },
        { label: 'Tipo', key: 'tipoMovimiento' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Cantidad', key: 'cantidad' },
        { label: 'Unidad', key: 'unidad' },
        { label: 'Precio Unt', key: 'precioUnit' },
        { label: 'Total', key: 'total' },
        { label: 'Estado', key: 'estado' },
        { label: 'Tipo de pago', key: 'tipoPago' },
      ]}
      formFields={[
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'tipoMovimiento', label: 'Tipo de movimiento', type: 'select', options: ['gasto', 'compra_inventario'], required: true },
        { key: 'descripcion', label: 'Descripcion', type: 'text', required: true },
        { key: 'codigoBarras', label: 'ID / Código de barras', type: 'barcode', required: true, visibleWhen: esCompra },
        { key: 'marca', label: 'Marca', type: 'text', required: true, visibleWhen: esCompra },
        { key: 'color', label: 'Color', type: 'text', required: true, visibleWhen: esCompra },
        { key: 'codigoColor', label: 'Código de color', type: 'text', required: true, visibleWhen: esCompra },
        { key: 'tamano', label: 'Tamaño (gramos)', type: 'number', required: true, visibleWhen: esCompra },
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

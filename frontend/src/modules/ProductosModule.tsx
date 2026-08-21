import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, cproducto: 1, descripcion: 'Tulipanes', manoObra: 25, materiales: 15, empaque: 21, otros: 0, costoMateriales: 36, costoProduccion: 61, ganancia: 99, precioVenta: 160 },
  { id: 2, cproducto: 2, descripcion: 'Girasoles', manoObra: 25, materiales: 30, empaque: 25, otros: 0, costoMateriales: 55, costoProduccion: 80, ganancia: 120, precioVenta: 200 },
  { id: 3, cproducto: 3, descripcion: 'Lavanda', manoObra: 15, materiales: 12, empaque: 5, otros: 0, costoMateriales: 17, costoProduccion: 32, ganancia: 68, precioVenta: 100 },
  { id: 4, cproducto: 8, descripcion: 'vaca', manoObra: 0, materiales: 0, empaque: 25, otros: 0, costoMateriales: 25, costoProduccion: 25, ganancia: 375, precioVenta: 400 },
]

export default function ProductosModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_producto ?? 0),
    fotoUrl: row.foto_url ?? row.fotoUrl ?? 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80',
    cproducto: Number(row.cproducto ?? 0),
    descripcion: row.descripcion ?? '',
    manoObra: Number(row.mano_obra ?? row.manoObra ?? 0),
    materiales: Number(row.materiales ?? 0),
    empaque: Number(row.empaque ?? 0),
    otros: Number(row.otros ?? 0),
    costoMateriales: Number(row.costo_materiales ?? row.costoMateriales ?? 0),
    costoProduccion: Number(row.costo_produccion ?? row.costoProduccion ?? 0),
    ganancia: Number(row.ganancia ?? 0),
    precioVenta: Number(row.precio_venta ?? row.precioVenta ?? 0),
    estado: row.estado ?? 'Activo',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    cproducto: Number(payload.cproducto ?? 0),
    descripcion: payload.descripcion,
    mano_obra: Number(payload.manoObra ?? 0),
    materiales: Number(payload.materiales ?? 0),
    empaque: Number(payload.empaque ?? 0),
    otros: Number(payload.otros ?? 0),
    costo_materiales: Number(payload.costoMateriales ?? 0),
    costo_produccion: Number(payload.costoProduccion ?? 0),
    ganancia: Number(payload.ganancia ?? 0),
    precio_venta: Number(payload.precioVenta ?? 0),
    foto_url: payload.fotoUrl ?? 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80',
    estado: payload.estado ?? 'Activo',
  })

  return (
    <CrudModule
      moduleKey="productos"
      title="Panel de Productos"
      subtitle="Control de costos y precio de venta de la hoja PRODUCTOS"
      command={command}
      apiUrl="/api/productos"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Foto', key: 'fotoUrl', render: (value) => (
          <img src={String(value || 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80')} alt="Producto" className="h-12 w-12 rounded-md object-cover" />
        ) },
        { label: 'CPRODUCTO', key: 'cproducto' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Mano de obra', key: 'manoObra' },
        { label: 'Materiales', key: 'materiales' },
        { label: 'Empaque', key: 'empaque' },
        { label: 'Otros', key: 'otros' },
        { label: 'Costo materiales', key: 'costoMateriales' },
        { label: 'Costo produccion', key: 'costoProduccion' },
        { label: 'Ganancia', key: 'ganancia' },
        { label: 'Precio venta', key: 'precioVenta' },
      ]}
      formFields={[
        { key: 'fotoUrl', label: 'URL de la foto', type: 'text', required: false },
        { key: 'cproducto', label: 'Codigo producto', type: 'number', required: true },
        { key: 'descripcion', label: 'Descripcion', type: 'text', required: true },
        { key: 'manoObra', label: 'Mano de obra', type: 'number', required: true },
        { key: 'materiales', label: 'Materiales', type: 'number', required: true },
        { key: 'empaque', label: 'Empaque', type: 'number', required: true },
        { key: 'otros', label: 'Otros', type: 'number', required: false },
        { key: 'costoMateriales', label: 'Costo materiales', type: 'number', required: true },
        { key: 'costoProduccion', label: 'Costo produccion', type: 'number', required: true },
        { key: 'ganancia', label: 'Ganancia', type: 'number', required: true },
        { key: 'precioVenta', label: 'Precio de venta', type: 'number', required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

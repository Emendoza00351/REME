import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, cproducto: 1, descripcion: 'Tulipanes', tiempoHoras: 1, precioHora: 25, materiales: 15, empaque: 21, otros: 0, costoMateriales: 15, costoProduccion: 61, porcentajeGanancia: 150, manoObra: 25, ganancia: 91.5, precioVenta: 152.5 },
  { id: 2, cproducto: 2, descripcion: 'Girasoles', tiempoHoras: 1, precioHora: 25, materiales: 30, empaque: 25, otros: 0, costoMateriales: 30, costoProduccion: 80, porcentajeGanancia: 150, manoObra: 25, ganancia: 120, precioVenta: 200 },
]

export default function ProductosModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_producto ?? 0),
    fotoUrl: row.foto_url ?? row.fotoUrl ?? 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80',
    cproducto: Number(row.cproducto ?? 0),
    descripcion: row.descripcion ?? '',
    tamanoCm: Number(row.tamano_cm ?? row.tamanoCm ?? 0),
    manoObra: Number(row.mano_obra ?? row.manoObra ?? 0),
    tiempoHoras: Number(row.tiempo_horas ?? row.tiempoHoras ?? 0),
    precioHora: Number(row.precio_hora ?? row.precioHora ?? 0),
    materiales: Number(row.materiales ?? 0),
    empaque: Number(row.empaque ?? 0),
    otros: Number(row.otros ?? 0),
    costoMateriales: Number(row.costo_materiales ?? row.costoMateriales ?? 0),
    costoProduccion: Number(row.costo_produccion ?? row.costoProduccion ?? 0),
    ganancia: Number(row.ganancia ?? 0),
    porcentajeGanancia: Number(row.porcentaje_ganancia ?? row.porcentajeGanancia ?? 0),
    precioVenta: Number(row.precio_venta ?? row.precioVenta ?? 0),
    estado: row.estado ?? 'Activo',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    cproducto: Number(payload.cproducto ?? 0),
    descripcion: payload.descripcion,
    tamano_cm: Number(payload.tamanoCm ?? 0),
    tiempo_horas: Number(payload.tiempoHoras ?? 0),
    precio_hora: Number(payload.precioHora ?? 0),
    mano_obra: Number(payload.manoObra ?? 0),
    materiales: Number(payload.materiales ?? 0),
    empaque: Number(payload.empaque ?? 0),
    otros: Number(payload.otros ?? 0),
    costo_materiales: Number(payload.costoMateriales ?? 0),
    costo_produccion: Number(payload.costoProduccion ?? 0),
    ganancia: Number(payload.ganancia ?? 0),
    porcentaje_ganancia: Number(String(payload.porcentajeGanancia ?? 0).replace('%', '')),
    precio_venta: Number(payload.precioVenta ?? 0),
    foto_url: payload.fotoUrl ?? 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80',
    estado: payload.estado ?? 'Activo',
  })

  return (
    <CrudModule
      moduleKey="productos"
      title="Panel de Productos"
      subtitle="Módulo maestro: código, foto, costos y precio de venta"
      command={command}
      apiUrl="/api/productos"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'CPRODUCTO', key: 'cproducto' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Tamaño (cm)', key: 'tamanoCm' },
        { label: 'Tiempo (h)', key: 'tiempoHoras' },
        { label: 'Precio x hora', key: 'precioHora' },
        { label: 'Mano de obra', key: 'manoObra' },
        { label: 'Costo materiales', key: 'costoMateriales' },
        { label: 'Empaque', key: 'empaque' },
        { label: 'Otros', key: 'otros' },
        { label: 'Costo produccion', key: 'costoProduccion' },
        { label: '% ganancia', key: 'porcentajeGanancia' },
        { label: 'Ganancia', key: 'ganancia' },
        { label: 'Precio venta', key: 'precioVenta' },
        { label: 'Foto', key: 'fotoUrl', render: (value) => (
          <img src={String(value || 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80')} alt="Producto" className="h-12 w-12 rounded-md object-cover" />
        ) },
      ]}
      formFields={[
        { key: 'cproducto', label: 'Codigo producto', type: 'number', required: false, readOnly: true },
        { key: 'descripcion', label: 'Descripcion', type: 'text', required: true },
        { key: 'tamanoCm', label: 'Tamaño (cm)', type: 'number', required: false },
        { key: 'tiempoHoras', label: 'Tiempo (horas)', type: 'number', required: true },
        { key: 'precioHora', label: 'Precio por hora', type: 'number', required: true },
        { key: 'manoObra', label: 'Mano de obra', type: 'number', required: false, readOnly: true },
        { key: 'materiales', label: 'Materiales', type: 'number', required: true },
        { key: 'empaque', label: 'Empaque', type: 'number', required: true },
        { key: 'otros', label: 'Otros', type: 'number', required: false },
        { key: 'costoMateriales', label: 'Costo materiales', type: 'number', required: false, readOnly: true },
        { key: 'costoProduccion', label: 'Costo produccion', type: 'number', required: false, readOnly: true },
        { key: 'porcentajeGanancia', label: 'Porcentaje de ganancia', type: 'select', options: ['25%', '50%', '100%', '150%'], required: true },
        { key: 'ganancia', label: 'Ganancia', type: 'number', required: false, readOnly: true },
        { key: 'precioVenta', label: 'Precio de venta', type: 'number', required: false, readOnly: true },
        { key: 'fotoUrl', label: 'Archivo de imagen', type: 'file', required: false },
      ]}
      initialRows={DEFAULT_ROWS}
      deriveForm={(form) => {
        const tiempo = Number(form.tiempoHoras || 0)
        const hora = Number(form.precioHora || 0)
        const materiales = Number(form.materiales || 0)
        const empaque = Number(form.empaque || 0)
        const otros = Number(form.otros || 0)
        const manoObra = tiempo * hora
        const costoProduccion = manoObra + materiales + empaque + otros
        const porcentaje = Number(String(form.porcentajeGanancia || 0).replace('%', ''))
        const ganancia = costoProduccion * porcentaje / 100
        return {
          manoObra: manoObra.toFixed(2),
          costoMateriales: (materiales + empaque).toFixed(2),
          costoProduccion: costoProduccion.toFixed(2),
          ganancia: ganancia.toFixed(2),
          precioVenta: (costoProduccion + ganancia).toFixed(2),
        }
      }}
    />
  )
}

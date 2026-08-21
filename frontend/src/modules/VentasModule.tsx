import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 101, fechaPedido: 45658, cliente: 'joeni', cp: 1, producto: 'Tulipanes', color: 'varios', descripcion: 'rojo, rosado, blanco', cantidad: 6, precioUnidad: 160, total: 960, tiempoDias: 38, fechaEntrega: 45696, app: '', direccion: '', estado: 'entregado', tipoPago: 'Banco' },
  { id: 102, fechaPedido: 45668, cliente: '8902 9167', cp: 45, producto: 'messi', color: 'uniforme', descripcion: 'barca', cantidad: 1, precioUnidad: 890, total: 890, tiempoDias: 30, fechaEntrega: 45698, app: '', direccion: '', estado: 'entregado', tipoPago: 'Banco' },
  { id: 103, fechaPedido: 45850, cliente: 'lizzy', cp: 83, producto: 'fundas para audifonos de diadema', color: 'Cerezas', descripcion: 'Ver foto w app', cantidad: 1, precioUnidad: 623.3333333, total: 623.3333333, tiempoDias: 15, fechaEntrega: 45865, app: 'personal', direccion: '', estado: 'pendiente', tipoPago: 'Banco' },
]

export default function VentasModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_pedido ?? 0),
    fechaPedido: row.fecha_pedido ?? row.fechaPedido ?? '',
    cliente: row.cliente ?? '',
    cp: Number(row.cp ?? 0),
    producto: row.producto ?? '',
    color: row.color ?? '',
    descripcion: row.descripcion ?? '',
    cantidad: Number(row.cantidad ?? 0),
    precioUnidad: Number(row.precio_unidad ?? row.precioUnidad ?? 0),
    total: Number(row.total ?? 0),
    adelanto: Number(row.adelanto ?? (Number(row.total ?? 0) * 0.5)),
    saldoRestante: Number(row.saldo_restante ?? row.saldoRestante ?? Math.max(Number(row.total ?? 0) - Number(row.adelanto ?? 0), 0)),
    tiempoDias: Number(row.tiempo_dias ?? row.tiempoDias ?? 0),
    fechaEntrega: row.fecha_entrega ?? row.fechaEntrega ?? '',
    app: row.app ?? '',
    direccion: row.direccion ?? '',
    estado: row.estado ?? 'pendiente',
    tipoPago: row.tipo_pago ?? row.tipoPago ?? 'Banco',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    fecha_pedido: payload.fechaPedido,
    id_cliente: 1,
    cliente: payload.cliente,
    cp: Number(payload.cp ?? 0),
    producto: payload.producto,
    color: payload.color,
    descripcion: payload.descripcion,
    cantidad: Number(payload.cantidad ?? 0),
    precio_unidad: Number(payload.precioUnidad ?? 0),
    total: Number(payload.total ?? 0),
    adelanto: Number(payload.adelanto ?? (Number(payload.total ?? 0) * 0.5)),
    saldo_restante: Number(payload.saldoRestante ?? Math.max(Number(payload.total ?? 0) - Number(payload.adelanto ?? 0), 0)),
    tiempo_dias: Number(payload.tiempoDias ?? 0),
    fecha_entrega: payload.fechaEntrega,
    app: payload.app,
    direccion: payload.direccion,
    estado: payload.estado,
    tipo_pago: payload.tipoPago,
  })

  return (
    <CrudModule
      moduleKey="ventas"
      title="Panel de Ventas"
      subtitle="Control de pedidos y entregas de la hoja VENTAS"
      command={command}
      apiUrl="/api/pedidos"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Fecha pedido', key: 'fechaPedido' },
        { label: 'Cliente', key: 'cliente' },
        { label: 'C.P', key: 'cp' },
        { label: 'Producto', key: 'producto' },
        { label: 'Color', key: 'color' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Cantidad', key: 'cantidad' },
        { label: 'Precio unidad', key: 'precioUnidad' },
        { label: 'Entrega', key: 'fechaEntrega' },
        { label: 'Total', key: 'total' },
        { label: '50% anticipo', key: 'adelanto' },
        { label: 'Saldo', key: 'saldoRestante' },
        { label: 'App', key: 'app' },
        { label: 'Estado', key: 'estado' },
        { label: 'Tipo pago', key: 'tipoPago' },
      ]}
      formFields={[
        { key: 'fechaPedido', label: 'Fecha de pedido', type: 'text', required: true },
        { key: 'cliente', label: 'Cliente', type: 'text', required: true },
        { key: 'cp', label: 'C.P', type: 'number', required: true },
        { key: 'producto', label: 'Producto / mezcla', type: 'text', required: true },
        { key: 'color', label: 'Color', type: 'text', required: true },
        { key: 'descripcion', label: 'Descripcion de pedido', type: 'text', required: true },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
        { key: 'precioUnidad', label: 'Precio unidad', type: 'number', required: true },
        { key: 'total', label: 'Total', type: 'number', required: true },
        { key: 'adelanto', label: '50% anticipo', type: 'number', required: true },
        { key: 'saldoRestante', label: 'Saldo restante', type: 'number', required: true },
        { key: 'tiempoDias', label: 'Tiempo (dias)', type: 'number', required: true },
        { key: 'fechaEntrega', label: 'Fecha entrega', type: 'text', required: true },
        { key: 'app', label: 'App', type: 'select', options: ['Wapp', 'TikTok', 'personal', ''], required: false },
        { key: 'direccion', label: 'Direccion', type: 'text', required: false },
        { key: 'estado', label: 'Estado', type: 'select', options: ['entregado', 'pendiente'], required: true },
        { key: 'tipoPago', label: 'Tipo de pago', type: 'select', options: ['Banco', 'Efectivo'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 201, controlPedido: 45658, cliente: 'joeni', producto: 'Tulipanes', total: 960, tipoPago: 'Banco', estadoCobro: 'cobrado', canal: '', fechaEntrega: 45696 },
  { id: 202, controlPedido: 45850, cliente: 'lizzy', producto: 'fundas para audifonos', total: 623.3333333, tipoPago: 'Banco', estadoCobro: 'por cobrar', canal: 'personal', fechaEntrega: 45865 },
  { id: 203, controlPedido: 45842, cliente: 'Carlos Torres', producto: 'Muneca reversible 14cm', total: 510, tipoPago: 'Banco', estadoCobro: 'cobrado', canal: 'Wapp', fechaEntrega: 45857 },
]

export default function FacturacionModule({ command, rows }: { command: ModuleCommand; rows?: RowRecord[] }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_pedido ?? row.controlPedido ?? 0),
    controlPedido: Number(row.controlPedido ?? row.id_pedido ?? row.id ?? 0),
    cliente: row.cliente ?? '',
    producto: row.producto ?? '',
    total: Number(row.total ?? 0),
    adelanto: Number(row.adelanto ?? 0),
    saldoRestante: Number(row.saldoRestante ?? row.saldo_restante ?? Math.max(Number(row.total ?? 0) - Number(row.adelanto ?? 0), 0)),
    tipoPago: row.tipoPago ?? row.tipo_pago ?? 'Banco',
    canal: row.canal ?? row.app ?? '',
    fechaEntrega: row.fechaEntrega ?? row.fecha_entrega ?? '',
    estadoCobro: row.estadoCobro ?? (Number(row.saldoRestante ?? row.saldo_restante ?? 0) <= 0 ? 'cobrado' : 'por cobrar'),
    envioRequerido: (row.envioRequerido ?? row.envio_requerido) ? 1 : 0,
    costoEnvio: Number(row.costoEnvio ?? row.costo_envio ?? 0),
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    id: Number(payload.id ?? 0),
    controlPedido: Number(payload.controlPedido ?? 0),
    cliente: payload.cliente,
    producto: payload.producto,
    total: Number(payload.total ?? 0),
    adelanto: Number(payload.adelanto ?? 0),
    saldoRestante: Number(payload.saldoRestante ?? Math.max(Number(payload.total ?? 0) - Number(payload.adelanto ?? 0), 0)),
    tipoPago: payload.tipoPago,
    canal: payload.canal,
    fecha_entrega: payload.fechaEntrega,
    estado: payload.estadoCobro === 'cobrado' ? 'entregado' : 'pendiente',
    app: payload.canal,
    tipo_pago: payload.tipoPago,
    fechaEntrega: payload.fechaEntrega,
  })

  const sourceRows = rows && rows.length > 0 ? rows : DEFAULT_ROWS

  return (
    <CrudModule
      moduleKey="facturacion"
      title="Panel de Facturacion"
      subtitle="Comprobantes, impuestos y cobros"
      command={command}
      apiUrl="/api/facturacion"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Control pedido', key: 'controlPedido' },
        { label: 'Cliente', key: 'cliente' },
        { label: 'Producto', key: 'producto' },
        { label: 'Total', key: 'total' },
        { label: 'Anticipo', key: 'adelanto' },
        { label: 'Saldo', key: 'saldoRestante' },
        { label: 'Envío', key: 'costoEnvio' },
        { label: 'Tipo pago', key: 'tipoPago' },
        { label: 'Canal', key: 'canal' },
        { label: 'Fecha entrega', key: 'fechaEntrega' },
        { label: 'Estado cobro', key: 'estadoCobro' },
      ]}
      formFields={[
        { key: 'controlPedido', label: 'Control pedido', type: 'text', required: true },
        { key: 'cliente', label: 'Cliente', type: 'text', required: true },
        { key: 'producto', label: 'Producto', type: 'text', required: true },
        { key: 'total', label: 'Total', type: 'number', required: true },
        { key: 'adelanto', label: 'Anticipo', type: 'number', required: true },
        { key: 'saldoRestante', label: 'Saldo restante', type: 'number', required: true },
        { key: 'tipoPago', label: 'Tipo de pago', type: 'select', options: ['Banco', 'Efectivo'], required: true },
        { key: 'canal', label: 'Canal app', type: 'select', options: ['Wapp', 'TikTok', 'personal', ''], required: false },
        { key: 'fechaEntrega', label: 'Fecha entrega', type: 'text', required: true },
        { key: 'estadoCobro', label: 'Estado cobro', type: 'select', options: ['cobrado', 'por cobrar'], required: true },
      ]}
      initialRows={sourceRows}
    />
  )
}

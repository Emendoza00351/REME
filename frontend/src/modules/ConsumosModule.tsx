import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = []

export default function ConsumosModule({ command }: { command: ModuleCommand }) {
  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_consumo ?? 0),
    fecha: row.fecha ?? '',
    codigoBarras: row.codigo_barras ?? row.codigoBarras ?? '',
    codigoPedido: row.codigo_pedido ?? row.codigoPedido ?? '',
    producto: row.producto ?? '',
    pesoInicial: Number(row.peso_inicial ?? row.pesoInicial ?? 0),
    pesoFinal: Number(row.peso_final ?? row.pesoFinal ?? 0),
    pesoConsumido: Number(row.peso_consumido ?? row.pesoConsumido ?? 0),
    unidadesProducidas: Number(row.unidades_producidas ?? row.unidadesProducidas ?? 0),
    rollosConsumidos: Number(row.rollos_consumidos ?? row.rollosConsumidos ?? 1),
    observacion: row.observacion ?? '',
  })

  const serializePayload = (payload: Record<string, string | number>) => ({
    fecha: payload.fecha,
    codigo_barras: payload.codigoBarras,
    codigo_pedido: payload.codigoPedido,
    producto: payload.producto,
    peso_inicial: Number(payload.pesoInicial ?? 0),
    peso_final: Number(payload.pesoFinal ?? 0),
    unidades_producidas: Number(payload.unidadesProducidas ?? 0),
    rollos_consumidos: Number(payload.rollosConsumidos ?? 1),
    observacion: payload.observacion,
  })

  return (
    <CrudModule
      moduleKey="inventario"
      title="Consumos de inventario"
      subtitle="Registro manual de rollos utilizados y producción obtenida"
      command={command}
      apiUrl="/api/consumos"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      tableColumns={[
        { label: 'Fecha', key: 'fecha' },
        { label: 'ID del rollo', key: 'codigoBarras' },
        { label: 'Pedido', key: 'codigoPedido' },
        { label: 'Producto fabricado', key: 'producto' },
        { label: 'Peso inicial (g)', key: 'pesoInicial' },
        { label: 'Peso final (g)', key: 'pesoFinal' },
        { label: 'Peso consumido (g)', key: 'pesoConsumido' },
        { label: 'Unidades producidas', key: 'unidadesProducidas' },
        { label: 'Rollos consumidos', key: 'rollosConsumidos' },
        { label: 'Observación', key: 'observacion' },
      ]}
      formFields={[
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'codigoBarras', label: 'ID del rollo', type: 'barcode', required: true },
        { key: 'codigoPedido', label: 'Número de pedido', type: 'number', required: false },
        { key: 'producto', label: 'Producto fabricado', type: 'text', required: true },
        { key: 'pesoInicial', label: 'Peso inicial (gramos)', type: 'number', required: true },
        { key: 'pesoFinal', label: 'Peso final (gramos)', type: 'number', required: true },
        { key: 'pesoConsumido', label: 'Peso consumido (gramos)', type: 'number', required: false, readOnly: true },
        { key: 'unidadesProducidas', label: 'Unidades producidas', type: 'number', required: true },
        { key: 'rollosConsumidos', label: 'Rollos consumidos (calculado)', type: 'number', required: false, readOnly: true },
        { key: 'observacion', label: 'Observación', type: 'text', required: false },
      ]}
      initialRows={DEFAULT_ROWS}
      deriveForm={(form) => ({
        pesoConsumido: Math.max(0, Number(form.pesoInicial || 0) - Number(form.pesoFinal || 0)).toFixed(2),
      })}
    />
  )
}

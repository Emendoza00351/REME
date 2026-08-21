import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, concepto: 'Ingresos', total: 12420, efectivo: 0, banco: 0, lado: 'Ingreso' },
  { id: 2, concepto: 'Por cobrar', total: 3473.333333, efectivo: 0, banco: 0, lado: 'Ingreso' },
  { id: 3, concepto: 'Egresos', total: 8200, efectivo: 0, banco: 12560, lado: 'Egreso' },
  { id: 4, concepto: 'Por pagar', total: 3930, efectivo: 0, banco: 0, lado: 'Egreso' },
  { id: 5, concepto: 'Ganancia estimada', total: 3763.333333, efectivo: 0, banco: 0, lado: 'Resultado' },
]

export default function ResultadosModule({ command }: { command: ModuleCommand }) {
  return (
    <CrudModule
      moduleKey="resultados"
      title="Estado de Resultados"
      subtitle="Vista operativa basada en la hoja ESTADO DE RESULTADOS"
      command={command}
      tableColumns={[
        { label: 'Concepto', key: 'concepto' },
        { label: 'Total', key: 'total' },
        { label: 'Efectivo', key: 'efectivo' },
        { label: 'Banco', key: 'banco' },
        { label: 'Tipo', key: 'lado' },
      ]}
      formFields={[
        { key: 'concepto', label: 'Concepto', type: 'text', required: true },
        { key: 'total', label: 'Total', type: 'number', required: true },
        { key: 'efectivo', label: 'Efectivo', type: 'number', required: false },
        { key: 'banco', label: 'Banco', type: 'number', required: false },
        { key: 'lado', label: 'Tipo', type: 'select', options: ['Ingreso', 'Egreso', 'Resultado'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}

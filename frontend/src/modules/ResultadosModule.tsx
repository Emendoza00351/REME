import { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import type { ModuleCommand } from '../types/module'

type Resumen = {
  ingresosVentas: number
  anticipos: number
  cuentasPorCobrar: number
  egresos: number
  gananciaEstimada: number
  pedidosFinalizados: number
}

const money = (value: number) => `L ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ResultadosModule({ command }: { command: ModuleCommand }) {
  const [data, setData] = useState<Resumen | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/resultados/resumen')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar el resumen')))
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar el resumen'))
  }, [command.id])

  const cards = data ? [
    ['Ingresos por pedidos', money(data.ingresosVentas)],
    ['Anticipos recibidos', money(data.anticipos)],
    ['Por cobrar', money(data.cuentasPorCobrar)],
    ['Egresos', money(data.egresos)],
    ['Ganancia estimada', money(data.gananciaEstimada)],
    ['Pedidos finalizados', String(data.pedidosFinalizados)],
  ] : []

  return (
    <div className="erp-card resultados-panel">
      <div className="resultados-heading"><h2 className="font-title">Analítica y reportes</h2><p>Ingresos, egresos y ganancia calculados desde pedidos finalizados y gastos registrados.</p></div>
      {error && <p className="resultados-error">{error}</p>}
      {!data && !error && <p className="resultados-loading">Cargando resumen...</p>}
      {data && <div className="resultados-grid">{cards.map(([label, value]) => <div className="resultado-kpi" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  BadgeDollarSign, Boxes, ChartNoAxesCombined, PackageSearch, Receipt, ShoppingBag, Users,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '../types/module'
import { usePermissions } from '../context/PermissionsContext'
import { apiFetch } from '../utils/api'

type Tarjeta = {
  titulo: string
  Icon: LucideIcon
  module: ModuleKey
  formato?: 'moneda'
}

const TARJETAS: Tarjeta[] = [
  { titulo: 'Gastos',      Icon: BadgeDollarSign,     module: 'gastos' },
  { titulo: 'Ventas',      Icon: ShoppingBag,         module: 'ventas' },
  { titulo: 'Facturación', Icon: Receipt,             module: 'facturacion' },
  { titulo: 'Clientes',    Icon: Users,               module: 'clientes' },
  { titulo: 'Productos',   Icon: PackageSearch,       module: 'productos' },
  { titulo: 'Inventario',  Icon: Boxes,               module: 'inventario' },
  { titulo: 'Resultados',  Icon: ChartNoAxesCombined, module: 'resultados', formato: 'moneda' },
]

const money = (value: number) => `L ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type ResumenGeneralProps = {
  onAbrir: (module: ModuleKey) => void
}

export default function ResumenGeneral({ onAbrir }: ResumenGeneralProps) {
  const { can } = usePermissions()
  const [conteos, setConteos] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch('/api/resumen', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(setConteos)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const tarjetas = TARJETAS.filter((t) => can(t.module))

  return (
    <div className="erp-resumen">
      <div className="erp-resumen-grid">
        {tarjetas.map((t) => {
          const valor = conteos?.[t.module]
          return (
            <button
              key={t.module}
              type="button"
              className="erp-resumen-item"
              onClick={() => onAbrir(t.module)}
              title={`Abrir ${t.titulo}`}
            >
              <span className="erp-resumen-item-head">
                <span className="erp-resumen-item-icon">
                  <t.Icon size={14} />
                </span>
                <span className="erp-resumen-item-title">{t.titulo}</span>
              </span>
              <span className="erp-resumen-item-value">
                {valor === undefined ? '—' : t.formato === 'moneda' ? money(valor) : valor}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

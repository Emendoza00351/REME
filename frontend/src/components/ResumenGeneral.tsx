import {
  BadgeDollarSign, Barcode, Boxes, ChartNoAxesCombined, PackageSearch, Receipt, ShoppingBag, Users,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '../types/module'

type Tarjeta = {
  titulo: string
  Icon: LucideIcon
  module: ModuleKey
}

const TARJETAS: Tarjeta[] = [
  { titulo: 'Gastos',      Icon: BadgeDollarSign,     module: 'gastos' },
  { titulo: 'Ventas',      Icon: ShoppingBag,         module: 'ventas' },
  { titulo: 'Facturación', Icon: Receipt,             module: 'facturacion' },
  { titulo: 'Clientes',    Icon: Users,               module: 'clientes' },
  { titulo: 'Códigos',     Icon: Barcode,             module: 'codigos' },
  { titulo: 'Productos',   Icon: PackageSearch,       module: 'productos' },
  { titulo: 'Inventario',  Icon: Boxes,               module: 'inventario' },
  { titulo: 'Resultados',  Icon: ChartNoAxesCombined, module: 'resultados' },
]

type ResumenGeneralProps = {
  onAbrir: (module: ModuleKey) => void
}

export default function ResumenGeneral({ onAbrir }: ResumenGeneralProps) {
  return (
    <div className="erp-resumen">
      <div className="erp-resumen-grid">
        {TARJETAS.map((t) => (
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
            {/* Sin BD conectada: el valor queda como marcador hasta que haya datos reales */}
            <span className="erp-resumen-item-value">—</span>
          </button>
        ))}
      </div>
    </div>
  )
}

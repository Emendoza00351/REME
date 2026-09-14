import { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

type CatalogItem = {
  id?: number
  id_producto?: number
  cproducto?: number
  descripcion?: string
  precio_venta?: number | string
  precioVenta?: number | string
  foto_url?: string
  fotoUrl?: string
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80'
const FLOWER_IMAGES = [
  'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
]

const DEMO_ITEMS: CatalogItem[] = [
  {
    id: 1,
    descripcion: 'Tulipa',
    precio_venta: 160,
    foto_url: FLOWER_IMAGES[0],
  },
  {
    id: 2,
    descripcion: 'Rosa',
    precio_venta: 180,
    foto_url: FLOWER_IMAGES[1],
  },
]

const formatearPrecio = (valor: number | string | undefined) => {
  const numero = Number(valor ?? 0)
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero)
}

export default function CatalogoModule() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch('/api/productos', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el catálogo')
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setItems(list.length > 0 ? list : DEMO_ITEMS)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setItems(DEMO_ITEMS)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#E4E4E1] pb-3">
        <div>
          <h2 className="font-title text-[18px] font-semibold uppercase tracking-[0.03em] text-[#3B2A21]">Catálogo</h2>
          <p className="text-[12px] text-[#7A6656]">Vista de productos administrados en Productos</p>
        </div>
      </div>

      {loading ? (
        <div className="text-[13px] text-[#7A6656]">Cargando catálogo...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D8D8D4] bg-[#FFFDFB] p-8 text-center text-[13px] text-[#7A6656]">
          Aún no hay productos para mostrar en el catálogo.
        </div>
      ) : (
        <div className="catalog-grid">
          {items.map((item, index) => {
            const precio = Number(item.precio_venta ?? item.precioVenta ?? 0)
            const imagen = item.foto_url || item.fotoUrl || FLOWER_IMAGES[index % FLOWER_IMAGES.length] || FALLBACK_IMAGE
            const nombre = item.descripcion || `Producto ${item.cproducto ?? item.id_producto ?? item.id ?? ''}`

            return (
              <div
                key={item.id ?? item.id_producto ?? item.cproducto ?? Math.random()}
                className="overflow-hidden rounded-[22px] border border-[#F0E3E1] bg-white shadow-[0_8px_24px_rgba(124,90,86,0.08)] transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="relative h-48 w-full overflow-hidden bg-[#F8F3F1]">
                  <img
                    src={imagen}
                    alt={nombre}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = FLOWER_IMAGES[index % FLOWER_IMAGES.length] || FALLBACK_IMAGE
                    }}
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#99784F] backdrop-blur-sm">
                    {nombre.toLowerCase().includes('tul') ? 'Tulipán' : nombre.toLowerCase().includes('rosa') ? 'Rosa' : 'Flor'}
                  </div>
                </div>

                <div className="space-y-1 p-3">
                  <h3 className="line-clamp-2 text-[14px] font-semibold leading-tight text-[#3B2A21]">{nombre}</h3>
                  <div className="flex items-center justify-between rounded-xl bg-[#FFF9F7] px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A7362]">Precio</span>
                    <span className="text-[18px] font-bold text-[#99784F]">{formatearPrecio(precio)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

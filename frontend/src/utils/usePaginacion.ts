import { useEffect, useMemo, useState } from 'react'

export function usePaginacion<T>(items: T[], initialLimit = 10) {
  const [pageLimit, setPageLimit] = useState(initialLimit)
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    setPagina(1)
  }, [items.length, pageLimit])

  const totalPaginas = Math.max(1, Math.ceil(items.length / pageLimit))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * pageLimit

  const pageItems = useMemo(() => items.slice(inicio, inicio + pageLimit), [items, inicio, pageLimit])

  return {
    pageLimit,
    setPageLimit,
    paginaActual,
    totalPaginas,
    pageItems,
    irAnterior: () => setPagina((p) => Math.max(1, p - 1)),
    irSiguiente: () => setPagina((p) => Math.min(totalPaginas, p + 1)),
  }
}

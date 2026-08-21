import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

function compararValores(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') return na - nb

  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}

export function useTableSort<T extends Record<string, unknown>>(filas: T[], columnaInicial: keyof T | null = null) {
  const [columna, setColumna] = useState<keyof T | null>(columnaInicial)
  const [direccion, setDireccion] = useState<SortDir>('asc')

  const ordenadas = useMemo(() => {
    if (!columna) return filas
    const copia = [...filas]
    copia.sort((a, b) => {
      const cmp = compararValores(a[columna], b[columna])
      return direccion === 'asc' ? cmp : -cmp
    })
    return copia
  }, [filas, columna, direccion])

  const ordenarPor = (key: keyof T) => {
    if (columna === key) {
      setDireccion((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setColumna(key)
      setDireccion('asc')
    }
  }

  return { ordenadas, columna, direccion, ordenarPor }
}

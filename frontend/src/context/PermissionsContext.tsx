import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar' | 'imprimir' | 'exportar' | 'aprobar'
export type Permisos = Record<string, Record<Accion, boolean>>

const PERMISO_VACIO: Record<Accion, boolean> = {
  ver: false,
  crear: false,
  editar: false,
  eliminar: false,
  imprimir: false,
  exportar: false,
  aprobar: false,
}

const PermissionsContext = createContext<Permisos>({})

export function PermissionsProvider({ permisos, children }: { permisos: Permisos; children: ReactNode }) {
  return <PermissionsContext.Provider value={permisos}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const permisos = useContext(PermissionsContext)
  return {
    permisos,
    can: (modulo: string, accion: Accion = 'ver') => !!(permisos[modulo] ?? PERMISO_VACIO)[accion],
  }
}

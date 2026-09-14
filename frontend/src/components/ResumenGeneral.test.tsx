import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResumenGeneral from './ResumenGeneral'
import { PermissionsProvider } from '../context/PermissionsContext'
import type { Permisos } from '../context/PermissionsContext'

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ gastos: 3, clientes: 7 }) })),
}))

const permisoVer = { ver: true, crear: false, editar: false, eliminar: false, imprimir: false, exportar: false, aprobar: false }
const permisoNada = { ...permisoVer, ver: false }

function renderConPermisos(permisos: Permisos) {
  const onAbrir = vi.fn()
  render(
    <PermissionsProvider permisos={permisos}>
      <ResumenGeneral onAbrir={onAbrir} />
    </PermissionsProvider>,
  )
  return { onAbrir }
}

describe('ResumenGeneral', () => {
  it('solo muestra tarjetas de módulos con permiso de ver', () => {
    renderConPermisos({ gastos: permisoVer, clientes: permisoNada })

    expect(screen.getByTitle('Abrir Gastos')).toBeInTheDocument()
    expect(screen.queryByTitle('Abrir Clientes')).not.toBeInTheDocument()
  })

  it('abre el módulo correspondiente al hacer click en una tarjeta', () => {
    const { onAbrir } = renderConPermisos({ gastos: permisoVer })

    fireEvent.click(screen.getByTitle('Abrir Gastos'))
    expect(onAbrir).toHaveBeenCalledWith('gastos')
  })

  it('reemplaza el marcador "—" por el valor real una vez que llega la respuesta', async () => {
    renderConPermisos({ gastos: permisoVer })

    await waitFor(() => expect(screen.getByTitle('Abrir Gastos')).toHaveTextContent('3'))
  })
})

import { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../utils/usePaginacion'

type Evento = {
  id: number
  fecha: string
  usuario: string
  rol: string
  modulo: string
  accion: string
  registroId: number | null
  estado: string
  codigoHttp: number
}

const ACCION_LABEL: Record<string, string> = {
  crear: 'Creó',
  editar: 'Editó',
  eliminar: 'Eliminó',
  login: 'Inició sesión',
  login_fallido: 'Intento de acceso fallido',
  login_bloqueado: 'Acceso bloqueado (usuario inactivo)',
  logout: 'Cerró sesión',
}

const formatearFecha = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
}

const thClass = 'px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#7A6656]'
const tdClass = 'whitespace-nowrap px-3 py-2 text-[#3B2A21]'

export default function AuditoriaModule() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/auditoria')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar la bitácora')
        return res.json()
      })
      .then((rows) => setEventos(Array.isArray(rows) ? rows : []))
      .catch(() => setError('No se pudo cargar la bitácora.'))
      .finally(() => setLoading(false))
  }, [])

  const { pageLimit, setPageLimit, paginaActual, totalPaginas, pageItems, irAnterior, irSiguiente } =
    usePaginacion(eventos)

  return (
    <div className="erp-card overflow-hidden">
      <div className="border-b border-[#E4E4E1] bg-[#5C3A35] px-4 py-3 text-white">
        <h2 className="font-title text-[18px] font-semibold uppercase tracking-[0.03em]">Bitácora</h2>
        <p className="mt-0.5 text-[12px] text-[#F3E1D6]">Registro de lo que hace cada usuario en el sistema</p>
      </div>

      {error && (
        <div className="border-b border-[#f0d9cc] bg-[#fff5ee] px-4 py-2 text-[12px] text-[#9e3f1f]">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-[860px] border-collapse text-[12px]">
          <thead className="bg-[#FFFFFF]">
            <tr>
              <th className={thClass}>Fecha</th>
              <th className={thClass}>Usuario</th>
              <th className={thClass}>Rol</th>
              <th className={thClass}>Módulo</th>
              <th className={thClass}>Acción</th>
              <th className={thClass}>Registro</th>
              <th className={thClass}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center text-[12px] text-[#8A7362]" colSpan={7}>
                  Cargando...
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-[12px] text-[#8A7362]" colSpan={7}>
                  Todavía no hay eventos registrados.
                </td>
              </tr>
            ) : (
              pageItems.map((ev, idx) => (
                <tr key={ev.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-(--row-alt)'}>
                  <td className={tdClass}>{formatearFecha(ev.fecha)}</td>
                  <td className={tdClass}>{ev.usuario}</td>
                  <td className={tdClass}>{ev.rol}</td>
                  <td className={tdClass}>{ev.modulo}</td>
                  <td className={tdClass}>{ACCION_LABEL[ev.accion] ?? ev.accion}</td>
                  <td className={tdClass}>{ev.registroId ?? '—'}</td>
                  <td className={tdClass}>
                    <span className={ev.estado === 'ok' ? 'text-[#2F6F4E]' : 'text-[#9e3f1f]'}>
                      {ev.estado === 'ok' ? 'OK' : `Error ${ev.codigoHttp}`}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginacion
        pageLimit={pageLimit}
        onPageLimitChange={setPageLimit}
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        onPrev={irAnterior}
        onNext={irSiguiente}
        totalItems={eventos.length}
        itemsSuffix={`evento${eventos.length !== 1 ? 's' : ''}`}
      />
    </div>
  )
}

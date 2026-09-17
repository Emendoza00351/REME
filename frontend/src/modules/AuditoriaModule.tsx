import { useEffect, useMemo, useState } from 'react'
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
  const [search, setSearch] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    apiFetch('/api/auditoria', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar la bitácora')
        return res.json()
      })
      .then((rows) => setEventos(Array.isArray(rows) ? rows : []))
      .catch(() => {
        if (controller.signal.aborted) return
        setError('No se pudo cargar la bitácora.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  const filtrados = useMemo(() => {
    let filas = eventos

    if (fechaDesde || fechaHasta) {
      filas = filas.filter((ev) => {
        const fecha = String(ev.fecha ?? '').slice(0, 10)
        if (!fecha) return false
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta && fecha > fechaHasta) return false
        return true
      })
    }

    if (estadoFiltro) {
      filas = filas.filter((ev) => ev.estado === estadoFiltro)
    }

    // Cada palabra puede estar en una columna distinta (p. ej. "juan crear").
    const palabras = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (palabras.length > 0) {
      filas = filas.filter((ev) => {
        const valores = [ev.usuario, ev.rol, ev.modulo, ACCION_LABEL[ev.accion] ?? ev.accion, ev.registroId, ev.estado]
          .map((v) => String(v ?? '').toLowerCase())
        return palabras.every((palabra) => valores.some((valor) => valor.includes(palabra)))
      })
    }

    return filas
  }, [eventos, search, fechaDesde, fechaHasta, estadoFiltro])

  const { pageLimit, setPageLimit, paginaActual, totalPaginas, pageItems, irAnterior, irSiguiente } =
    usePaginacion(filtrados)

  return (
    <div className="erp-card overflow-hidden">
      <div className="border-b border-[#E4E4E1] bg-[#80613E] px-4 py-3 text-white">
        <h2 className="font-title text-[18px] font-semibold uppercase tracking-[0.03em]">Bitácora</h2>
        <p className="mt-0.5 text-[12px] text-[#F3E1D6]">Registro de lo que hace cada usuario en el sistema</p>
      </div>

      {error && (
        <div className="border-b border-[#f0d9cc] bg-[#fff5ee] px-4 py-2 text-[12px] text-[#9e3f1f]">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E4E1] bg-[#FFFFFF] px-3 py-2">
        <input
          className="field w-64!"
          placeholder="Buscar en esta tabla"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="crud-filtro-fecha">
          <input className="field" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} aria-label="Desde" title="Desde" />
          <span>a</span>
          <input className="field" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} aria-label="Hasta" title="Hasta" />
        </span>
        <select className="field w-auto!" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} aria-label="Estado">
          <option value="">Estado: todos</option>
          <option value="ok">OK</option>
          <option value="error">Error</option>
        </select>
      </div>

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
                  {eventos.length === 0 ? 'Todavía no hay eventos registrados.' : 'No hay eventos que coincidan con el filtro.'}
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
        totalItems={filtrados.length}
        itemsSuffix={`evento${eventos.length !== 1 ? 's' : ''}`}
      />
    </div>
  )
}

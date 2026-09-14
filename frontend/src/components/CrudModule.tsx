import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FilePlus2, Pencil, Trash2 } from 'lucide-react'
import { usePermissions } from '../context/PermissionsContext'
import type { ModuleCommand, ModuleKey } from '../types/module'
import Paginacion from './Paginacion'
import { ThOrdenable } from './SortIcon'
import { apiFetch } from '../utils/api'
import { usePaginacion } from '../utils/usePaginacion'
import { useTableSort } from '../utils/useTableSort'
import ConfirmDialog from './ConfirmDialog'

export type RowRecord = {
  id: number
  [key: string]: string | number
}

type TableColumn = {
  label: string
  key: string
  render?: (value: string | number, row: RowRecord) => React.ReactNode
}

type FormField = {
  key: string
  label: string
  required?: boolean
  type?: 'text' | 'number' | 'date' | 'file' | 'barcode' | 'select'
  options?: string[]
  /** Se completa solo (vía deriveForm) — el input queda visible pero no editable. */
  readOnly?: boolean
  visibleWhen?: (form: Record<string, string>) => boolean
}

type CrudModuleProps = {
  moduleKey: ModuleKey
  title: string
  subtitle: string
  tableColumns: TableColumn[]
  formFields: FormField[]
  initialRows: RowRecord[]
  command: ModuleCommand
  apiUrl?: string
  normalizeRow?: (row: Record<string, any>) => RowRecord
  serializePayload?: (payload: Record<string, string | number>) => Record<string, any>
  /** Tras cambiar `changedKey`, puede devolver otros campos a recalcular (p. ej. usuario = DNI del empleado elegido). */
  deriveForm?: (form: Record<string, string>, changedKey: string) => Record<string, string> | void
}

function sanitizeFormData(form: Record<string, string>, fields: FormField[]) {
  const out: Record<string, string | number> = {}
  for (const field of fields) {
    const value = form[field.key] ?? ''
    out[field.key] = field.type === 'number' ? Number(value || 0) : value
  }
  return out
}

function mostrarValor(value: string | number, key: string) {
  const texto = String(value ?? '')
  if (!texto || !key.toLowerCase().includes('fecha')) return texto
  const match = texto.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? texto
}

export default function CrudModule({
  moduleKey,
  title,
  subtitle,
  tableColumns,
  formFields,
  initialRows,
  command,
  apiUrl,
  normalizeRow,
  serializePayload,
  deriveForm,
}: CrudModuleProps) {
  const { can } = usePermissions()
  const [items, setItems] = useState<RowRecord[]>(initialRows)
  const [view, setView] = useState<'table' | 'form'>('table')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<RowRecord | null>(null)
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(formFields.map((f) => [f.key, ''])),
  )

  useEffect(() => {
    setItems(initialRows)
  }, [initialRows])

  useEffect(() => {
    if (!apiUrl) return

    apiFetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar la tabla')
        return res.json()
      })
      .then((rows) => {
        const mapped = Array.isArray(rows) ? rows.map((row) => normalizeRow ? normalizeRow(row) : ({ id: Number(row.id ?? 0), ...row })) : []
        setItems(mapped)
      })
      .catch(() => setItems(initialRows))
  }, [apiUrl, initialRows, normalizeRow])

  const ultimoCommandId = useRef(command.id)

  useEffect(() => {
    // `command.id` solo cambia cuando el sidebar/inicio disparan una acción real;
    // sin este guard, cualquier re-render de CrudModule (p. ej. el que provoca
    // openNew/openEdit al llamar setView) vuelve a correr este efecto, ve que
    // command.action sigue en 'table' y revierte la vista antes de pintarse.
    if (command.id === ultimoCommandId.current) return
    ultimoCommandId.current = command.id

    if (command.action === 'new' && can(moduleKey, 'crear')) {
      setEditingId(null)
      setForm(Object.fromEntries(formFields.map((f) => [f.key, ''])))
      setView('form')
      return
    }

    if (command.action === 'table') {
      setView('table')
    }
  }, [can, command, formFields, moduleKey])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((item) => Object.values(item).some((v) => String(v).toLowerCase().includes(q)))
  }, [items, search])

  const {
    pageLimit,
    setPageLimit,
    paginaActual,
    totalPaginas,
    pageItems,
    irAnterior,
    irSiguiente,
  } = usePaginacion(filtered)

  const { ordenadas, columna, direccion, ordenarPor } = useTableSort(pageItems)

  const updateField = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      const derivados = deriveForm ? deriveForm(next, key) : undefined
      return derivados ? { ...next, ...derivados } : next
    })
  }

  const openNew = () => {
    setEditingId(null)
    setForm(Object.fromEntries(formFields.map((f) => [f.key, ''])))
    setMessage('')
    setView('form')
  }

  const openEdit = (row: RowRecord) => {
    setEditingId(row.id)
    setForm(() => {
      const base = Object.fromEntries(
        formFields.map((f) => {
          const value = row[f.key]
          return [f.key, value == null ? '' : String(value)]
        }),
      )
      // Recalcula los campos derivados (p. ej. usuario/correo/teléfono desde
      // el empleado) en vez de confiar en columnas que la fila puede no traer.
      const derivados = deriveForm ? deriveForm(base, 'empleado') : undefined
      return derivados ? { ...base, ...derivados } : base
    })
    setMessage('')
    setView('form')
  }

  const saveItem = async () => {
    const requiredMissing = formFields.find((f) => f.visibleWhen?.(form) !== false && f.required && !String(form[f.key] ?? '').trim())
    if (requiredMissing) {
      setMessage(`Falta completar: ${requiredMissing.label}`)
      return
    }

    const payload = sanitizeFormData(form, formFields)
    const body = serializePayload ? serializePayload(payload) : payload

    try {
      if (apiUrl) {
        const url = editingId == null ? apiUrl : `${apiUrl}/${editingId}`
        const method = editingId == null ? 'POST' : 'PUT'
        const response = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(errText || 'Error al guardar')
        }

        const saved = await response.json()
        const mapped = normalizeRow ? normalizeRow(saved) : ({ id: Number(saved.id ?? saved.id_producto ?? saved.id_pedido ?? saved.id_inventario ?? 0), ...saved })

        setItems((prev) => {
          if (editingId == null) return [mapped, ...prev]
          return prev.map((row) => (row.id === editingId ? mapped : row))
        })
        setMessage(editingId == null ? 'Registro creado correctamente.' : 'Registro actualizado correctamente.')
      } else {
        if (editingId == null) {
          const newRow: RowRecord = { id: Date.now(), ...payload }
          setItems((prev) => [newRow, ...prev])
          setMessage('Registro creado en modo diseno (mock).')
        } else {
          setItems((prev) => prev.map((row) => (row.id === editingId ? { ...row, ...payload } : row)))
          setMessage('Registro actualizado en modo diseno (mock).')
        }
      }

      setView('table')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar el registro.')
    }
  }

  const deleteItem = async (row: RowRecord) => {
    try {
      if (apiUrl) {
        const response = await apiFetch(`${apiUrl}/${row.id}`, { method: 'DELETE' })
        if (!response.ok) {
          const errText = await response.text()
          throw new Error(errText || 'Error al eliminar')
        }
      }
      setItems((prev) => prev.filter((item) => item.id !== row.id))
      setMessage('Registro eliminado correctamente.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al eliminar el registro.')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className={`erp-card erp-card--${moduleKey} overflow-hidden`}>
      <div className="border-b border-[#E4E4E1] bg-[#80613E] px-4 py-3 text-white">
        <h2 className="font-title text-[18px] font-semibold uppercase tracking-[0.03em]">{title}</h2>
        <p className="mt-0.5 text-[12px] text-[#F3E1D6]">{subtitle}</p>
      </div>

      {message && <div className="border-b border-[#f0d9cc] bg-[#fff5ee] px-4 py-2 text-[12px] text-[#9e3f1f]">{message}</div>}

      {view === 'table' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E4E1] bg-[#FFFFFF] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="field w-64!"
                placeholder="Buscar en esta tabla"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              {can(moduleKey, 'exportar') && (
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-[#D8D8D4] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#99784F] hover:bg-[#FFFFFF]"
                  onClick={() => setMessage('Export Excel/PDF quedo listo para conectar en backend.')}
                >
                  <Download size={14} />
                  Exportar
                </button>
              )}

              {can(moduleKey, 'crear') && (
                <button
                  className="inline-flex items-center gap-1 rounded-md bg-(--primary) px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-(--primary-hover)"
                  onClick={openNew}
                >
                  <FilePlus2 size={14} />
                  Nuevo
                </button>
              )}
            </div>
          </div>

          <div className="erp-table-scroll overflow-x-auto">
            <table className="min-w-[900px] border-collapse text-[12px]">
              <thead className="bg-[#FFFFFF]">
                <tr>
                  {tableColumns.map((col) => (
                    <ThOrdenable<RowRecord>
                      key={col.key}
                      label={col.label}
                      campo={col.key}
                      columna={columna}
                      direccion={direccion}
                      onClick={ordenarPor}
                    />
                  ))}
                  <th className="erp-col-acciones sticky right-0 bg-[#FFFFFF] px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#7A6656]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-(--row-alt)'}>
                    {tableColumns.map((col) => (
                      <td key={`${row.id}-${col.key}`} className="whitespace-nowrap px-3 py-2 text-[#3B2A21]">
                        {col.render ? col.render(row[col.key] ?? '', row) : mostrarValor(row[col.key] ?? '', col.key)}
                      </td>
                    ))}
                    <td className={`erp-col-acciones sticky right-0 px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-(--row-alt)'}`}>
                      <div className="flex items-center gap-1.5">
                        {can(moduleKey, 'editar') && (
                          <button
                            className="inline-flex items-center justify-center rounded-md border border-[#D8D8D4] p-1.5 text-[#99784F] hover:bg-[#FFFFFF]"
                            onClick={() => openEdit(row)}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {can(moduleKey, 'eliminar') && (
                          <button
                            className="inline-flex items-center justify-center rounded-md border border-[#E4B8B4] p-1.5 text-[#9e3f1f] hover:bg-[#fff5ee]"
                            onClick={() => setConfirmDelete(row)}
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {ordenadas.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-[12px] text-[#8A7362]" colSpan={tableColumns.length + 1}>
                      No hay resultados para el filtro actual.
                    </td>
                  </tr>
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
            totalItems={filtered.length}
            itemsSuffix={`registro${filtered.length !== 1 ? 's' : ''}`}
          />
        </div>
      )}

      {view === 'form' && (
        <div className="crud-form-shell">
          <div className="crud-form-section">
            <div className="crud-form-section-heading"><div><span className="crud-form-eyebrow">Ficha de registro</span><h3>Datos principales</h3></div><span className="crud-form-status">{editingId == null ? 'Nuevo registro' : 'Edición'}</span></div>
            <div className="crud-form-grid">
              {formFields.filter((field) => field.visibleWhen?.(form) !== false).map((field) => (
                <div key={field.key} className="crud-form-field">
                  <label>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      className="field"
                      value={form[field.key] ?? ''}
                      disabled={field.readOnly}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'barcode' ? (
                    <input type="text" inputMode="numeric" autoComplete="off" autoFocus className="field" value={form[field.key] ?? ''} placeholder="Escanea el código 1D/2D" onChange={(e) => updateField(field.key, e.target.value)} />
                  ) : field.type === 'file' ? (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        className="field"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = () => {
                            const image = new Image()
                            image.onload = () => {
                              const maxSize = 1200
                              const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
                              const canvas = document.createElement('canvas')
                              canvas.width = Math.max(1, Math.round(image.width * scale))
                              canvas.height = Math.max(1, Math.round(image.height * scale))
                              const context = canvas.getContext('2d')
                              if (!context) return
                              context.drawImage(image, 0, 0, canvas.width, canvas.height)
                              updateField(field.key, canvas.toDataURL('image/jpeg', 0.82))
                            }
                            image.src = String(reader.result ?? '')
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </>
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      className={`field${field.readOnly ? ' crud-field-readonly' : ''}`}
                      value={form[field.key] ?? ''}
                      readOnly={field.readOnly}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="crud-form-actions">
            <button
              className="crud-btn crud-btn-secondary"
              onClick={() => setView('table')}
            >
              Cancelar
            </button>
            <button
              className="crud-btn crud-btn-primary"
              onClick={saveItem}
            >
              {apiUrl ? 'Guardar' : 'Guardar (mock)'}
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Eliminar registro"
        message={`El registro ${confirmDelete?.id ?? ''} se eliminará de forma permanente.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteItem(confirmDelete) }}
      />
    </div>
  )
}

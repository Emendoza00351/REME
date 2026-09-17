import { useEffect, useMemo, useState } from 'react'
import { ReceiptText, Save, Search } from 'lucide-react'
import { apiFetch } from '../utils/api'
import { imprimirTicketFactura } from '../utils/ticket'
import type { ModuleCommand } from '../types/module'

type Invoice = Record<string, any>
type Filtro = 'todas' | 'pendientes' | 'facturadas'

const money = (value: number) => `L ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function FacturacionModule({ command }: { command: ModuleCommand }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [form, setForm] = useState({
    adelanto: '', envioRequerido: false, costoEnvio: '', tipoPago: 'Banco', fechaEntrega: '',
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadInvoices = (signal?: AbortSignal) => {
    setLoading(true)
    apiFetch('/api/facturacion', signal ? { signal } : {})
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudieron cargar las facturas')))
      .then((rows) => setInvoices(Array.isArray(rows) ? rows : []))
      .catch((error) => {
        if (signal?.aborted) return
        setMessage(error instanceof Error ? error.message : 'No se pudieron cargar las facturas')
      })
      .finally(() => { if (!signal?.aborted) setLoading(false) })
  }

  useEffect(() => {
    const controller = new AbortController()
    loadInvoices(controller.signal)
    return () => controller.abort()
  }, [command.id])

  // Las ya facturadas quedan para el historial, pero se desplazan al fondo
  // de la lista — lo que falta por facturar es lo que importa ver primero.
  const visibleInvoices = useMemo(() => {
    // Cada palabra puede estar en una columna distinta (p. ej. "juan cobrar").
    const palabras = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const filtradas = invoices.filter((invoice) => {
      if (filtro === 'pendientes' && invoice.facturado) return false
      if (filtro === 'facturadas' && !invoice.facturado) return false

      const fecha = String(invoice.fechaEntrega ?? '').slice(0, 10)
      if (fechaDesde || fechaHasta) {
        if (!fecha) return false
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta && fecha > fechaHasta) return false
      }

      if (palabras.length === 0) return true
      const valores = [invoice.controlPedido, invoice.cliente, invoice.producto, invoice.canal, invoice.tipoPago]
        .map((v) => String(v ?? '').toLowerCase())
      return palabras.every((palabra) => valores.some((valor) => valor.includes(palabra)))
    })
    return [...filtradas].sort((a, b) => Number(!!a.facturado) - Number(!!b.facturado))
  }, [invoices, search, filtro, fechaDesde, fechaHasta])

  const selectInvoice = (invoice: Invoice) => {
    setSelected(invoice)
    setForm({
      adelanto: String(invoice.adelanto ?? 0),
      envioRequerido: !!invoice.envioRequerido,
      costoEnvio: String(invoice.costoEnvio ?? 0),
      tipoPago: String(invoice.tipoPago ?? 'Banco'),
      fechaEntrega: String(invoice.fechaEntrega ?? ''),
    })
    setMessage('')
  }

  // El costo de envío se decide acá, al facturar — ya no se pregunta al armar
  // el pedido (ver VentasModule): a esa altura casi nunca se sabe todavía.
  const totalPedido = Number(selected?.total ?? 0)
  const costoEnvio = form.envioRequerido ? Number(form.costoEnvio || 0) : 0
  const totalConEnvio = totalPedido + costoEnvio
  const adelanto = Number(form.adelanto || 0)
  const saldoRestante = Math.max(totalConEnvio - adelanto, 0)

  const saveInvoice = async () => {
    if (!selected || saving) return
    setSaving(true)
    try {
      const response = await apiFetch(`/api/facturacion/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: selected.cliente,
          producto: selected.producto,
          adelanto,
          envioRequerido: form.envioRequerido,
          costoEnvio,
          tipoPago: form.tipoPago,
          fechaEntrega: form.fechaEntrega,
          canal: selected.canal,
        }),
      })
      const actualizado = await response.json()
      if (!response.ok) {
        setMessage('No se pudo guardar la factura.')
        return
      }

      // Guardar factura cierra el ciclo: el pedido queda Entregado y la
      // factura Facturada (lo hace el backend) — de acá sale el tiquete.
      imprimirTicketFactura({
        numero: actualizado.controlPedido,
        cliente: actualizado.cliente,
        producto: actualizado.producto,
        fechaEntrega: actualizado.fechaEntrega ? String(actualizado.fechaEntrega).slice(0, 10) : '',
        total: Number(actualizado.total ?? 0),
        envio: Number(actualizado.costoEnvio ?? 0),
        totalConEnvio: Number(actualizado.total ?? 0) + Number(actualizado.costoEnvio ?? 0),
        anticipo: Number(actualizado.adelanto ?? 0),
        saldo: Number(actualizado.saldoRestante ?? 0),
        tipoPago: actualizado.tipoPago,
      })

      setMessage(`Factura #${actualizado.controlPedido} guardada: pedido entregado y facturado.`)
      setSelected(actualizado)
      await loadInvoices()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="erp-card ventas-pos-card">
      <div className="ventas-pos-heading">
        <div>
          <h2 className="font-title">Facturación</h2>
          <p>Pedidos finalizados listos para cobrar.</p>
        </div>
        <div className="ventas-view-actions">
          <ReceiptText size={25} aria-hidden="true" />
        </div>
      </div>

      {message && <p className="facturacion-message">{message}</p>}

      <div className="ventas-pos-layout">
        <section className="ventas-products-panel">
          <div className="facturacion-toolbar">
            <div className="ventas-search">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cliente, pedido o producto..." />
            </div>
            <select className="facturacion-filtro" value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
              <option value="todas">Todas</option>
              <option value="pendientes">Por facturar</option>
              <option value="facturadas">Facturadas</option>
            </select>
            <span className="crud-filtro-fecha">
              <input className="field" type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} aria-label="Entrega desde" title="Entrega desde" />
              <span>a</span>
              <input className="field" type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} aria-label="Entrega hasta" title="Entrega hasta" />
            </span>
          </div>

          <div className="facturacion-list">
            <table className="facturacion-table">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Producto</th><th>Total</th><th>Saldo</th><th>Estado</th></tr></thead>
              <tbody>
                {visibleInvoices.map((invoice) => {
                  const total = Number(invoice.total ?? 0) + Number(invoice.costoEnvio ?? 0)
                  const saldo = Math.max(total - Number(invoice.adelanto ?? 0), 0)
                  return (
                    <tr
                      key={invoice.id}
                      className={selected?.id === invoice.id ? 'facturacion-row-open' : ''}
                      onClick={() => selectInvoice(invoice)}
                    >
                      <td>#{invoice.controlPedido}</td>
                      <td>{invoice.cliente}</td>
                      <td>{invoice.producto}</td>
                      <td>{money(total)}</td>
                      <td>{money(saldo)}</td>
                      <td><span className={`facturacion-status ${invoice.facturado ? 'is-paid' : ''}`}>{invoice.facturado ? 'Facturado' : 'Por facturar'}</span></td>
                    </tr>
                  )
                })}
                {!loading && visibleInvoices.length === 0 && (
                  <tr><td colSpan={6} className="facturacion-empty">No hay pedidos que coincidan.</td></tr>
                )}
                {loading && <tr><td colSpan={6} className="facturacion-empty">Cargando facturas...</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="ventas-cart-panel">
          <div className="ventas-cart-heading">
            <span><ReceiptText size={18} /> {selected ? `Factura #${selected.controlPedido}` : 'Factura'}</span>
            {selected?.facturado && <span className="facturacion-status is-paid">Facturado</span>}
          </div>

          {!selected && (
            <div className="ventas-cart-empty">
              <ReceiptText size={34} />
              <span>Selecciona un pedido de la lista para facturarlo</span>
            </div>
          )}

          {selected && <>
            <div className="ventas-cart-form">
              <label className="facturacion-field-full">Cliente<input value={selected.cliente ?? ''} readOnly /></label>
              <label className="facturacion-field-full">Producto<input value={selected.producto ?? ''} readOnly /></label>
              <label>Tipo de pago
                <select value={form.tipoPago} onChange={(event) => setForm({ ...form, tipoPago: event.target.value })}>
                  <option>Banco</option>
                  <option>Efectivo</option>
                </select>
              </label>
              <label>Fecha de entrega<input type="date" value={form.fechaEntrega.slice(0, 10)} onChange={(event) => setForm({ ...form, fechaEntrega: event.target.value })} /></label>
              <label>Anticipo / depósito<input type="number" min="0" value={form.adelanto} onChange={(event) => setForm({ ...form, adelanto: event.target.value })} /></label>
              <label className="ventas-shipping-toggle"><span>¿Requiere envío?</span><input type="checkbox" checked={form.envioRequerido} onChange={(event) => setForm({ ...form, envioRequerido: event.target.checked })} /></label>
              {form.envioRequerido && <label>Costo de envío<input type="number" min="0" value={form.costoEnvio} onChange={(event) => setForm({ ...form, costoEnvio: event.target.value })} /></label>}
            </div>

            <div className="ventas-totals">
              <div><span>Total del pedido</span><b>{money(totalPedido)}</b></div>
              <div><span>Envío</span><b>{money(costoEnvio)}</b></div>
              <div className="ventas-total"><span>Total a cobrar</span><b>{money(totalConEnvio)}</b></div>
              <div className="ventas-advance"><span>Saldo pendiente</span><b>{money(saldoRestante)}</b></div>
            </div>

            <button className="ventas-checkout" disabled={saving} onClick={saveInvoice} type="button">
              <Save size={17} /> {saving ? 'Guardando…' : 'Guardar factura'}<span>{money(totalConEnvio)}</span>
            </button>
          </>}
        </aside>
      </div>
    </div>
  )
}

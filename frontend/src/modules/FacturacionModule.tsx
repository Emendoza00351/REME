import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Save, ReceiptText } from 'lucide-react'
import { apiFetch } from '../utils/api'
import type { ModuleCommand } from '../types/module'

type Invoice = Record<string, any>

const money = (value: number) => `L ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function FacturacionModule({ command }: { command: ModuleCommand }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [form, setForm] = useState({ adelanto: '', costoEnvio: '', tipoPago: 'Banco', estadoCobro: 'por cobrar', fechaEntrega: '' })
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

  const openInvoice = (invoice: Invoice) => {
    if (selected?.id === invoice.id) {
      setSelected(null)
      return
    }
    setSelected(invoice)
    setForm({
      adelanto: String(invoice.adelanto ?? 0),
      costoEnvio: String(invoice.costoEnvio ?? 0),
      tipoPago: String(invoice.tipoPago ?? 'Banco'),
      estadoCobro: String(invoice.estadoCobro ?? 'por cobrar'),
      fechaEntrega: String(invoice.fechaEntrega ?? ''),
    })
    setMessage('')
  }

  const saveInvoice = async () => {
    if (!selected || saving) return
    setSaving(true)
    try {
      const total = Number(selected.total ?? 0) + Number(form.costoEnvio || 0)
      const adelanto = Number(form.adelanto || 0)
      const response = await apiFetch(`/api/facturacion/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: selected.cliente,
          producto: selected.producto,
          total,
          adelanto,
          saldoRestante: Math.max(total - adelanto, 0),
          tipoPago: form.tipoPago,
          estado: form.estadoCobro === 'cobrado' ? 'entregado' : 'pendiente',
          fechaEntrega: form.fechaEntrega,
          canal: selected.canal,
        }),
      })
      if (!response.ok) {
        setMessage('No se pudo guardar la factura.')
        return
      }
      setMessage('Factura actualizada correctamente.')
      loadInvoices()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="erp-card facturacion-panel">
      <div className="facturacion-heading">
        <div><h2 className="font-title">Facturación</h2><p>Pedidos finalizados listos para cobrar.</p></div>
        <ReceiptText size={24} />
      </div>
      {message && <p className="facturacion-message">{message}</p>}
      <div className="facturacion-table-wrap">
        <table className="facturacion-table">
          <thead><tr><th></th><th>Pedido</th><th>Cliente</th><th>Producto</th><th>Total</th><th>Anticipo</th><th>Saldo</th><th>Estado</th></tr></thead>
          <tbody>
            {invoices.map((invoice) => {
              const total = Number(invoice.total ?? 0) + Number(invoice.costoEnvio ?? 0)
              const saldo = Math.max(total - Number(invoice.adelanto ?? 0), 0)
              const isOpen = selected?.id === invoice.id
              return <Fragment key={invoice.id}>
                <tr className={isOpen ? 'facturacion-row-open' : ''} onClick={() => openInvoice(invoice)}>
                  <td>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                  <td>#{invoice.controlPedido}</td><td>{invoice.cliente}</td><td>{invoice.producto}</td><td>{money(total)}</td><td>{money(Number(invoice.adelanto ?? 0))}</td><td>{money(saldo)}</td><td><span className={`facturacion-status ${saldo <= 0 ? 'is-paid' : ''}`}>{saldo <= 0 ? 'Cobrado' : 'Por cobrar'}</span></td>
                </tr>
                {isOpen && <tr key={`${invoice.id}-detail`} className="facturacion-detail-row"><td colSpan={8}><div className="facturacion-detail">
                  <div className="facturacion-detail-title"><strong>Detalle de factura #{invoice.controlPedido}</strong><span>{invoice.canal || 'Sin canal'}</span></div>
                  <div className="facturacion-detail-grid">
                    <label>Cliente<input value={invoice.cliente ?? ''} readOnly /></label>
                    <label>Producto<input value={invoice.producto ?? ''} readOnly /></label>
                    <label>Total del pedido<input value={money(Number(invoice.total ?? 0))} readOnly /></label>
                    <label>Anticipo / depósito<input type="number" value={form.adelanto} onChange={(event) => setForm({ ...form, adelanto: event.target.value })} /></label>
                    <label>Costo de envío<input type="number" value={form.costoEnvio} onChange={(event) => setForm({ ...form, costoEnvio: event.target.value })} /></label>
                    <label>Tipo de pago<select value={form.tipoPago} onChange={(event) => setForm({ ...form, tipoPago: event.target.value })}><option>Banco</option><option>Efectivo</option></select></label>
                    <label>Estado de cobro<select value={form.estadoCobro} onChange={(event) => setForm({ ...form, estadoCobro: event.target.value })}><option value="por cobrar">Por cobrar</option><option value="cobrado">Cobrado</option></select></label>
                    <label>Fecha de entrega<input type="date" value={form.fechaEntrega.slice(0, 10)} onChange={(event) => setForm({ ...form, fechaEntrega: event.target.value })} /></label>
                  </div>
                  <button type="button" className="facturacion-save" disabled={saving} onClick={(event) => { event.stopPropagation(); saveInvoice() }}><Save size={15} /> {saving ? 'Guardando…' : 'Guardar factura'}</button>
                </div></td></tr>}
              </Fragment>
            })}
            {!loading && invoices.length === 0 && <tr><td colSpan={8} className="facturacion-empty">No hay pedidos finalizados para facturar.</td></tr>}
            {loading && <tr><td colSpan={8} className="facturacion-empty">Cargando facturas...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

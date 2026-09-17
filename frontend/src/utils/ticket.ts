/**
 * Tiquete imprimible: se abre en una ventana aparte con su propio HTML (no
 * comparte CSS con la app) y dispara el diálogo de impresión del navegador
 * apenas carga — como una caja registradora, no un botón "Imprimir" aparte.
 */
const ESTILOS = `
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 14px 12px; color: #111; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; letter-spacing: .04em; }
  .sub { text-align: center; font-size: 11px; margin: 0 0 10px; color: #444; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
  .fila { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin: 3px 0; }
  .fila b { text-align: right; }
  .total { font-size: 14px; font-weight: bold; }
  table.items { width: 100%; border-collapse: collapse; margin: 4px 0; }
  table.items td { font-size: 11px; padding: 2px 0; }
  table.items td:last-child { text-align: right; }
  footer { text-align: center; font-size: 11px; margin-top: 14px; color: #444; }
`

function abrirVentanaTicket(bodyHtml: string) {
  const ventana = window.open('', '_blank', 'width=340,height=640')
  if (!ventana) return
  ventana.document.write(`<!DOCTYPE html><html><head><title>Tiquete</title><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${bodyHtml}<script>window.onload = function () { window.print(); };</script></body></html>`)
  ventana.document.close()
}

const money = (value: number) => `L ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const hoy = () => new Date().toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function imprimirTicketPedido(data: {
  numero: number | string
  cliente: string
  canal: string
  items: { nombre: string; cantidad: number; precio: number }[]
  subtotal: number
  total: number
  anticipo: number
  saldo: number
}) {
  const filasItems = data.items
    .map((item) => `<tr><td>${item.nombre} x${item.cantidad}</td><td>${money(item.precio * item.cantidad)}</td></tr>`)
    .join('')

  abrirVentanaTicket(`
    <h1>REME</h1>
    <p class="sub">Comprobante de pedido</p>
    <div class="fila"><span>Pedido</span><b>#${data.numero}</b></div>
    <div class="fila"><span>Fecha</span><b>${hoy()}</b></div>
    <div class="fila"><span>Cliente</span><b>${data.cliente || '—'}</b></div>
    <div class="fila"><span>Canal</span><b>${data.canal || '—'}</b></div>
    <hr />
    <table class="items">${filasItems}</table>
    <hr />
    <div class="fila"><span>Subtotal</span><b>${money(data.subtotal)}</b></div>
    <div class="fila total"><span>Total</span><b>${money(data.total)}</b></div>
    <div class="fila"><span>Anticipo</span><b>${money(data.anticipo)}</b></div>
    <div class="fila"><span>Saldo pendiente</span><b>${money(data.saldo)}</b></div>
    <footer>¡Gracias por tu pedido!</footer>
  `)
}

export function imprimirTicketFactura(data: {
  numero: number | string
  cliente: string
  producto: string
  fechaEntrega: string
  total: number
  envio: number
  totalConEnvio: number
  anticipo: number
  saldo: number
  tipoPago: string
}) {
  abrirVentanaTicket(`
    <h1>REME</h1>
    <p class="sub">Comprobante de facturación</p>
    <div class="fila"><span>Factura</span><b>#${data.numero}</b></div>
    <div class="fila"><span>Fecha</span><b>${hoy()}</b></div>
    <div class="fila"><span>Cliente</span><b>${data.cliente || '—'}</b></div>
    <div class="fila"><span>Producto</span><b>${data.producto || '—'}</b></div>
    ${data.fechaEntrega ? `<div class="fila"><span>Entrega</span><b>${data.fechaEntrega}</b></div>` : ''}
    <hr />
    <div class="fila"><span>Total del pedido</span><b>${money(data.total)}</b></div>
    <div class="fila"><span>Envío</span><b>${money(data.envio)}</b></div>
    <div class="fila total"><span>Total a cobrar</span><b>${money(data.totalConEnvio)}</b></div>
    <div class="fila"><span>Anticipo</span><b>${money(data.anticipo)}</b></div>
    <div class="fila"><span>Saldo pendiente</span><b>${money(data.saldo)}</b></div>
    <div class="fila"><span>Tipo de pago</span><b>${data.tipoPago}</b></div>
    <hr />
    <footer>Pedido entregado · Facturado</footer>
  `)
}

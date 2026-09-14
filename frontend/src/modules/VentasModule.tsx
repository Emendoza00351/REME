import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardList, Minus, Pencil, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { apiFetch } from '../utils/api'
import ConfirmDialog from '../components/ConfirmDialog'
import type { ModuleCommand } from '../types/module'

type Product = {
  id: number
  codigo: number
  nombre: string
  precio: number
  foto: string
}

type CartItem = Product & { cantidad: number }
type Order = Record<string, any>
type InventoryItem = Record<string, any>

const DEFAULT_PRODUCTS: Product[] = [
  { id: 1, codigo: 1, nombre: 'Tulipa', precio: 160, foto: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=500&q=80' },
  { id: 2, codigo: 2, nombre: 'Rosa', precio: 180, foto: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=500&q=80' },
]

const money = (value: number) => `L ${value.toFixed(2)}`

export default function VentasModule({ command }: { command: ModuleCommand }) {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [clientes, setClientes] = useState<string[]>([])
  const [cliente, setCliente] = useState('')
  const [canal, setCanal] = useState('')
  const [numeroPedido, setNumeroPedido] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [anticipoPagado, setAnticipoPagado] = useState(false)
  const [metodoAnticipo, setMetodoAnticipo] = useState('')
  const [bancoAnticipo, setBancoAnticipo] = useState('')
  const [envioRequerido, setEnvioRequerido] = useState(false)
  const [costoEnvio, setCostoEnvio] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState<Order | null>(null)
  const [screen, setScreen] = useState<'pos' | 'orders'>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [productionOrder, setProductionOrder] = useState<Order | null>(null)
  const [productionRows, setProductionRows] = useState<Order[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null)
  const [productionForm, setProductionForm] = useState({ codigoBarras: '', marca: '', color: '', codigoColor: '', tamano: '', totalGramos: '', pesoInicial: '', pesoFinal: '', unidadesProducidas: '', observacion: '' })

  useEffect(() => {
    apiFetch('/api/productos')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los productos')))
      .then((rows) => setProducts(rows.map((row: Record<string, any>) => ({
        id: Number(row.id ?? row.id_producto ?? 0),
        codigo: Number(row.cproducto ?? 0),
        nombre: String(row.descripcion ?? 'Producto'),
        precio: Number(row.precio_venta ?? row.precioVenta ?? 0),
        foto: String(row.foto_url ?? row.fotoUrl ?? DEFAULT_PRODUCTS[0].foto),
      }))))
      .catch(() => setProducts(DEFAULT_PRODUCTS))
  }, [command.id])

  useEffect(() => {
    if (screen !== 'orders') return
    apiFetch('/api/pedidos')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los pedidos')))
      .then((rows) => setOrders(Array.isArray(rows) ? rows.slice().reverse() : []))
      .catch(() => setOrders([]))
  }, [screen, command.id])

  useEffect(() => {
    apiFetch('/api/inventario')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('No se pudo cargar el inventario')))
      .then((rows) => setInventoryItems(Array.isArray(rows) ? rows : []))
      .catch(() => setInventoryItems([]))
  }, [command.id])

  const loadOrders = async () => {
    const response = await apiFetch('/api/pedidos')
    if (!response.ok) throw new Error('No se pudieron cargar los pedidos')
    const rows = await response.json()
    setOrders(Array.isArray(rows) ? rows.slice().reverse() : [])
  }

  useEffect(() => {
    apiFetch('/api/clientes')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los clientes')))
      .then((rows) => setClientes(rows.map((row: Record<string, any>) => String(row.nombre ?? '')).filter(Boolean)))
      .catch(() => setClientes([]))
  }, [command.id])

  useEffect(() => {
    apiFetch('/api/pedidos')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los pedidos')))
      .then((rows) => setNumeroPedido(rows.reduce((max: number, row: Record<string, any>) => Math.max(max, Number(row.id_pedido ?? row.id ?? 0)), 0) + 1))
      .catch(() => setNumeroPedido(null))
  }, [command.id])

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => !query || `${product.codigo} ${product.nombre}`.toLowerCase().includes(query))
  }, [products, search])

  const subtotal = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const descuentoAplicado = 0
  const total = subtotal - descuentoAplicado + (envioRequerido ? costoEnvio : 0)
  const anticipoRequerido = total * 0.5

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) return current.map((item) => item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      return [...current, { ...product, cantidad: 1 }]
    })
    setMensaje('')
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const cantidad = item.cantidad + delta
      return cantidad > 0 ? [{ ...item, cantidad }] : []
    }))
  }

  const saveSale = async () => {
    if (!cliente.trim() || !canal || cart.length === 0) {
      setMensaje(!cliente.trim() ? 'Indica el nombre del cliente.' : !canal ? 'Selecciona por dónde se realizó el pedido.' : 'Agrega al menos un producto.')
      return
    }
    if (anticipoPagado && (!metodoAnticipo || ((metodoAnticipo === 'Transferencia' || metodoAnticipo === 'Tarjeta') && !bancoAnticipo.trim()))) {
      setMensaje('Completa el método y banco del anticipo pagado.')
      return
    }
    setGuardando(true)
    setMensaje('')
    try {
      const response = await apiFetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: cliente.trim(),
          descripcion: [
            descripcion.trim(),
            JSON.stringify(cart.map((item) => ({ producto: item.nombre, cantidad: item.cantidad, precio: item.precio }))),
          ].filter(Boolean).join(' | '),
          fecha_pedido: new Date().toISOString().slice(0, 10),
          producto: cart.map((item) => `${item.nombre} x ${item.cantidad}`).join(', '),
          cantidad: cart.reduce((sum, item) => sum + item.cantidad, 0),
          precio_unidad: cart.length === 1 ? cart[0].precio : 0,
          total,
          envio_requerido: envioRequerido,
          costo_envio: envioRequerido ? costoEnvio : 0,
          app: canal,
          descuento_porcentaje: 0,
          adelanto: anticipoPagado ? anticipoRequerido : 0,
          estado_anticipo: anticipoPagado ? 'pagado' : 'pendiente',
          anticipo_metodo_pago: anticipoPagado ? metodoAnticipo : null,
          anticipo_banco: anticipoPagado && (metodoAnticipo === 'Transferencia' || metodoAnticipo === 'Tarjeta') ? bancoAnticipo.trim() : null,
          tipo_pago: 'Banco',
          estado: 'pendiente',
        }),
      })
      if (!response.ok) throw new Error((await response.json()).error || 'No se pudo registrar el pedido.')
      setCart([])
      setCliente('')
      setCanal('')
      setDescripcion('')
      setAnticipoPagado(false)
      setMetodoAnticipo('')
      setBancoAnticipo('')
      setEnvioRequerido(false)
      setCostoEnvio(0)
      setMensaje('Pedido registrado correctamente.')
      await loadOrders()
      setScreen('orders')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo registrar el pedido.')
    } finally {
      setGuardando(false)
    }
  }

  const openProduction = async (order: Order) => {
    if (productionOrder?.id_pedido === order.id_pedido) {
      setProductionOrder(null)
      return
    }
    setProductionOrder(order)
    setSelectedInventory(null)
    setProductionForm({ codigoBarras: '', marca: '', color: '', codigoColor: '', tamano: '', totalGramos: '', pesoInicial: '', pesoFinal: '', unidadesProducidas: '', observacion: '' })
    const response = await apiFetch('/api/consumos')
    const rows = await response.json()
    setProductionRows((Array.isArray(rows) ? rows : []).filter((row) => Number(row.codigo_pedido) === Number(order.id_pedido)))
  }

  const selectInventory = (codigoBarras: string) => {
    const selected = inventoryItems.find((item) => String(item.codigo_barras ?? item.codigoBarras ?? '') === codigoBarras) ?? null
    setSelectedInventory(selected)
    setProductionForm((current) => ({
      ...current,
      codigoBarras,
      marca: selected?.marca ?? '',
      color: selected?.color ?? '',
      codigoColor: selected?.codigo_color ?? selected?.codigoColor ?? '',
      tamano: selected?.tamano == null ? '' : String(selected.tamano),
      totalGramos: selected?.total_gramos == null ? '' : String(selected.total_gramos),
    }))
  }

  const reloadProductionRows = async (orderId: number) => {
    const response = await apiFetch('/api/consumos')
    const rows = await response.json()
    setProductionRows((Array.isArray(rows) ? rows : []).filter((row) => Number(row.codigo_pedido) === orderId))
  }

  const saveProduction = async () => {
    if (!productionOrder) return
    const initial = Number(productionForm.pesoInicial)
    const final = Number(productionForm.pesoFinal)
    if (!productionForm.codigoBarras || !productionOrder.producto || initial <= 0 || final < 0 || final > initial) {
      setMensaje('Completa ID, producto y pesos válidos.')
      return
    }
    try {
      const response = await apiFetch('/api/consumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoPedido: productionOrder.id_pedido,
          codigoBarras: productionForm.codigoBarras,
          producto: String(productionOrder.producto ?? '').split(' x ')[0],
          color: productionForm.color,
          pesoInicial: initial,
          pesoFinal: final,
          unidadesProducidas: Number(productionForm.unidadesProducidas || 0),
          observacion: productionForm.observacion,
        }),
      })
      if (!response.ok) throw new Error((await response.json()).error || 'No se pudo guardar la producción.')
      await reloadProductionRows(Number(productionOrder.id_pedido))
      setMensaje('Producción agregada al pedido.')
      setSelectedInventory(null)
      setProductionForm((current) => ({ ...current, codigoBarras: '', marca: '', color: '', codigoColor: '', tamano: '', totalGramos: '', pesoInicial: '', pesoFinal: '', unidadesProducidas: '', observacion: '' }))
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar la producción.')
    }
  }

  const editOrder = (order: Order) => {
    setCliente(String(order.cliente ?? ''))
    setCanal(String(order.app ?? ''))
    setDescripcion(String(order.descripcion ?? ''))
    setMensaje(`Editando pedido #${order.id_pedido}.`)
    setScreen('pos')
  }

  const finalizeOrder = async (order: Order) => {
    const response = await apiFetch(`/api/pedidos/${order.id_pedido}/finalizar`, { method: 'POST' })
    if (!response.ok) {
      setMensaje('No se pudo finalizar el pedido.')
      return
    }
    setMensaje(`Pedido #${order.id_pedido} enviado a Facturación.`)
    setConfirmFinalize(null)
    await loadOrders()
  }

  return (
    <div className="erp-card ventas-pos-card">
      <div className="ventas-pos-heading">
        <div>
          <h2 className="font-title">{screen === 'pos' ? 'Punto de venta' : 'Pedidos registrados'}</h2>
          <p>{screen === 'pos' ? 'Selecciona productos y arma el pedido en un solo lugar.' : 'Consulta pedidos y agrega su producción por color y material.'}</p>
        </div>
        <div className="ventas-view-actions">
          {screen === 'pos' && <button type="button" onClick={() => { setProductionOrder(null); setScreen('orders') }}><ArrowLeft size={15} /> Volver a pedidos</button>}
          <ShoppingCart size={25} aria-hidden="true" />
        </div>
      </div>

      {screen === 'pos' && <div className="ventas-pos-layout">
        <section className="ventas-products-panel">
          <div className="ventas-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto por nombre o código..." /></div>
          <div className="ventas-product-grid">
            {visibleProducts.map((product) => (
              <button className="ventas-product-card" key={product.id} onClick={() => addToCart(product)} type="button">
                <img src={product.foto} alt="" />
                <span className="ventas-product-code">Código {product.codigo}</span>
                <strong>{product.nombre}</strong>
                <span className="ventas-product-price">{money(product.precio)}</span>
                <span className="ventas-product-add"><Plus size={15} /> Agregar</span>
              </button>
            ))}
            {visibleProducts.length === 0 && <p className="ventas-empty">No hay productos para la búsqueda.</p>}
          </div>
        </section>

        <aside className="ventas-cart-panel">
          <div className="ventas-cart-heading"><span><ShoppingCart size={18} /> Pedido #{numeroPedido ?? '...'}</span><b>{cart.reduce((sum, item) => sum + item.cantidad, 0)}</b></div>
          <div className="ventas-cart-items">
            {cart.length === 0 && <div className="ventas-cart-empty"><ShoppingCart size={34} /><span>Agrega productos para empezar</span></div>}
            {cart.map((item) => (
              <div className="ventas-cart-row" key={item.id}>
                <div><strong>{item.nombre}</strong><small>{money(item.precio)} c/u</small></div>
                <div className="ventas-quantity"><button type="button" onClick={() => updateQuantity(item.id, -1)} title="Reducir"><Minus size={13} /></button><span>{item.cantidad}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} title="Aumentar"><Plus size={13} /></button></div>
                <strong>{money(item.precio * item.cantidad)}</strong>
                <button className="ventas-remove" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} title="Quitar"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="ventas-cart-form">
            <label>Cliente<input list="clientes-disponibles" value={cliente} onChange={(event) => setCliente(event.target.value)} placeholder="Buscar cliente" /><datalist id="clientes-disponibles">{clientes.map((nombre) => <option key={nombre} value={nombre} />)}</datalist></label>
            <label>Canal del pedido<select value={canal} onChange={(event) => setCanal(event.target.value)}><option value="">Seleccionar</option><option value="WhatsApp">WhatsApp</option><option value="Instagram">Instagram</option><option value="Tienda">Tienda</option></select></label>
            <label className="ventas-description-field">Descripción del pedido<textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="Detalles, colores o indicaciones" rows={2} /></label>
            <label className="ventas-shipping-toggle"><span>¿Requiere envío?</span><input type="checkbox" checked={envioRequerido} onChange={(event) => setEnvioRequerido(event.target.checked)} /></label>
            {envioRequerido && <label>Costo de envío<input type="number" min="0" value={costoEnvio} onChange={(event) => setCostoEnvio(Number(event.target.value) || 0)} /></label>}
          </div>
          <div className="ventas-totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="ventas-discount-row"><span>Descuento</span><b>- {money(descuentoAplicado)}</b></div><div className="ventas-total"><span>Total del pedido</span><b>{money(total)}</b></div><div className="ventas-advance"><span>Anticipo requerido (50%)</span><b>{money(anticipoRequerido)}</b></div></div>
          <label className="ventas-payment-status"><input type="checkbox" checked={anticipoPagado} onChange={(event) => setAnticipoPagado(event.target.checked)} /> Anticipo del 50% pagado <span>{anticipoPagado ? 'Pagado' : 'Pendiente'}</span></label>
          {anticipoPagado && <div className="ventas-advance-form"><label>Medio del anticipo<select value={metodoAnticipo} onChange={(event) => setMetodoAnticipo(event.target.value)}><option value="">Seleccionar medio</option><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option></select></label>{(metodoAnticipo === 'Transferencia' || metodoAnticipo === 'Tarjeta') && <label>Banco<input value={bancoAnticipo} onChange={(event) => setBancoAnticipo(event.target.value)} placeholder="Nombre del banco" /></label>}</div>}
          <button className="ventas-checkout" disabled={guardando || cart.length === 0} onClick={saveSale} type="button"><CheckCircle2 size={17} /> {guardando ? 'Guardando...' : 'Registrar pedido'}<span>{money(total)}</span></button>
        </aside>
      </div>}

      {screen === 'orders' && <div className="ventas-orders-panel">
        <div className="ventas-orders-toolbar"><button type="button" className="ventas-new-order-btn" onClick={() => { setCart([]); setMensaje(''); setScreen('pos') }}><Plus size={15} /> Nuevo pedido</button></div>
        <div className="ventas-orders-table-wrap">
          <table className="ventas-orders-table">
            <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Producto</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {orders.map((order) => <Fragment key={order.id_pedido}>
                <tr>
                  <td>#{order.id_pedido}</td><td>{String(order.fecha_pedido ?? '').slice(0, 10)}</td><td>{order.cliente}</td><td>{order.app || '—'}</td><td>{order.producto}</td><td>{money(Number(order.total ?? 0))}</td><td>{order.estado}</td>
                  <td className="ventas-order-actions"><button type="button" className="ventas-production-btn ventas-action-icon" onClick={() => editOrder(order)} title="Editar pedido" aria-label="Editar pedido"><Pencil size={14} /></button><button type="button" className="ventas-production-btn ventas-action-icon" onClick={() => openProduction(order)} title="Agregar producción" aria-label="Agregar producción"><ClipboardList size={14} /></button>{!order.finalizado && <button type="button" className="ventas-production-btn ventas-action-icon" onClick={() => setConfirmFinalize(order)} title="Finalizar y enviar a Facturación" aria-label="Finalizar y enviar a Facturación"><CheckCircle2 size={14} /></button>}</td>
                </tr>
                {productionOrder?.id_pedido === order.id_pedido && <tr className="ventas-production-detail-row"><td colSpan={8}><section className="ventas-production-panel">
                  <div className="ventas-production-heading"><div><strong>Producción del pedido #{order.id_pedido}</strong><span>{order.producto}</span></div><button type="button" className="ventas-production-close" onClick={() => setProductionOrder(null)}>Cerrar producción</button></div>
                  <div className="ventas-production-form">
                    <label>ID del rollo<input value={productionForm.codigoBarras} onChange={(e) => selectInventory(e.target.value)} placeholder="Escanea el ID" /></label>
                    <label>Marca<input value={productionForm.marca} readOnly /></label>
                    <label>Color<input value={productionForm.color} readOnly /></label>
                    <label>Código de color<input value={productionForm.codigoColor} readOnly /></label>
                    <label>Peso inicial (g)<input type="number" value={productionForm.pesoInicial} onChange={(e) => setProductionForm({ ...productionForm, pesoInicial: e.target.value })} /></label>
                    <label>Peso final (g)<input type="number" value={productionForm.pesoFinal} onChange={(e) => setProductionForm({ ...productionForm, pesoFinal: e.target.value })} /></label>
                    <label>Peso consumido (g)<input value={Math.max(0, Number(productionForm.pesoInicial || 0) - Number(productionForm.pesoFinal || 0)).toFixed(2)} readOnly /></label>
                    <label>Rollos consumidos<input value={selectedInventory && Number(selectedInventory.tamano ?? 0) > 0 ? (Math.max(0, Number(productionForm.pesoInicial || 0) - Number(productionForm.pesoFinal || 0)) / Number(selectedInventory.tamano)).toFixed(2) : '0.00'} readOnly /></label>
                    <label>Unidades producidas<input type="number" value={productionForm.unidadesProducidas} onChange={(e) => setProductionForm({ ...productionForm, unidadesProducidas: e.target.value })} /></label>
                    <label className="ventas-description-field">Observación<input value={productionForm.observacion} onChange={(e) => setProductionForm({ ...productionForm, observacion: e.target.value })} /></label>
                  </div>
                  <button type="button" className="ventas-checkout" onClick={saveProduction}><Plus size={16} /> Agregar producción</button>
                  <table className="ventas-production-table"><thead><tr><th>Color</th><th>ID rollo</th><th>Peso inicial</th><th>Peso final</th><th>Consumido</th><th>Unidades</th></tr></thead><tbody>{productionRows.map((row) => <tr key={row.id_consumo}><td>{row.color || '—'}</td><td>{row.codigo_barras}</td><td>{row.peso_inicial} g</td><td>{row.peso_final} g</td><td>{row.peso_consumido} g</td><td>{row.unidades_producidas}</td></tr>)}</tbody></table>
                </section></td></tr>}
              </Fragment>)}
              {orders.length === 0 && <tr><td colSpan={8} className="ventas-empty">No hay pedidos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>}
      {mensaje && <p className="ventas-message">{mensaje}</p>}
      <ConfirmDialog open={confirmFinalize !== null} title="Finalizar pedido" message={`El pedido #${confirmFinalize?.id_pedido ?? ''} pasará a Facturación.`} confirmLabel="Finalizar pedido" onCancel={() => setConfirmFinalize(null)} onConfirm={() => { if (confirmFinalize) finalizeOrder(confirmFinalize) }} />
    </div>
  )
}

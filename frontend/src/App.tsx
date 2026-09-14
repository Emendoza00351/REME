import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BadgeDollarSign,
  BookOpen,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Expand,
  History,
  Home,
  IdCard,
  KeyRound,
  LogOut,
  Minimize2,
  PackageSearch,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Building2,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import AuditoriaModule from './modules/AuditoriaModule'
import ClientesModule from './modules/ClientesModule'
import CatalogoModule from './modules/CatalogoModule'
import ConsumosModule from './modules/ConsumosModule'
import { PermissionsProvider } from './context/PermissionsContext'
import EmpleadosModule from './modules/EmpleadosModule'
import FacturacionModule from './modules/FacturacionModule'
import GastosModule from './modules/GastosModule'
import InventarioModule from './modules/InventarioModule'
import ProductosModule from './modules/ProductosModule'
import ResultadosModule from './modules/ResultadosModule'
import RolesModule from './modules/RolesModule'
import UsuariosModule from './modules/UsuariosModule'
import VentasModule from './modules/VentasModule'
import ResumenGeneral from './components/ResumenGeneral'
import Login from './components/Login'
import type { Sesion } from './components/Login'
import { apiFetch, SESION_EXPIRADA_EVENT } from './utils/api'
import { SESION_KEY, leerSesion } from './utils/session'
import type { ModuleAction, ModuleCommand, ModuleKey } from './types/module'

const MODULE_TITLES: Record<ModuleKey, string> = {
  gastos: 'Gastos',
  ventas: 'Pedidos',
  facturacion: 'Facturación',
  clientes: 'Clientes',
  productos: 'Productos',
  catalogo: 'Catálogo',
  inventario: 'Inventario',
  consumos: 'Consumos',
  resultados: 'Resultados',
  empleados: 'Empleados',
  usuarios: 'Usuarios',
  roles: 'Roles',
  auditoria: 'Bitácora',
}

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  gastos: BadgeDollarSign,
  ventas: ShoppingBag,
  facturacion: Receipt,
  clientes: Users,
  productos: PackageSearch,
  catalogo: BookOpen,
  inventario: Boxes,
  consumos: ClipboardList,
  resultados: ChartNoAxesCombined,
  empleados: IdCard,
  usuarios: KeyRound,
  roles: UserCog,
  auditoria: History,
}

type MenuChild = { id: ModuleKey; label: string; Icon: LucideIcon }
type MenuItem = { id: string; label: string; Icon: LucideIcon; children: MenuChild[] }

/* El backend no tiene un módulo de permisos por cada pestaña: "catalogo" lee
   /api/catalogo, que exige el permiso "productos", y "consumos" lee
   /api/consumos, que exige "inventario" (mismo permiso que usa ConsumosModule
   al armar su CrudModule). Este mapa traduce la pestaña al módulo de permisos
   real para poder filtrar el menú correctamente. */
const PERMISO_DEL_MODULO: Record<ModuleKey, string> = {
  gastos: 'gastos',
  ventas: 'ventas',
  facturacion: 'facturacion',
  clientes: 'clientes',
  productos: 'productos',
  catalogo: 'productos',
  inventario: 'inventario',
  consumos: 'inventario',
  resultados: 'resultados',
  empleados: 'empleados',
  usuarios: 'usuarios',
  roles: 'roles',
  auditoria: 'auditoria',
}

/* Agrupado siguiendo el origen real de los datos en "REME 2025.xlsx":
   Ventas ← VENTAS · Gastos ← EGRESOS · Productos ← PRODUCTOS ·
   Inventario ← INVENTARIO · Resultados ← ESTADO DE RESULTADOS.
  Clientes y Facturación se derivan de esas hojas.
   "Seguridad" no viene del Excel: son las tablas empleados/usuarios/roles
   que ya existen en la base "reme" (mismo nombre que usa el backend). */
const MENU_ITEMS: MenuItem[] = [
  {
    id: 'administracion', label: 'Administración', Icon: Building2,
    children: [
      { id: 'ventas', label: 'Pedidos',  Icon: ShoppingBag },
      { id: 'gastos', label: 'Gastos',  Icon: BadgeDollarSign },
    ],
  },
  {
    id: 'clientes-cobros', label: 'Clientes y cobros', Icon: Users,
    children: [
      { id: 'clientes',    label: 'Clientes',    Icon: Users },
      { id: 'facturacion', label: 'Facturación', Icon: Receipt },
    ],
  },
  {
    id: 'catalogos', label: 'Catálogo y stock', Icon: BookOpen,
    children: [
      { id: 'productos',  label: 'Productos',        Icon: PackageSearch },
      { id: 'catalogo',   label: 'Catálogo',         Icon: ClipboardList },
      { id: 'inventario', label: 'Inventario',       Icon: Boxes },
      { id: 'consumos',   label: 'Consumos',         Icon: ClipboardList },
    ],
  },
  {
    id: 'analisis', label: 'Análisis', Icon: ChartNoAxesCombined,
    children: [
      { id: 'resultados', label: 'Resultados', Icon: ChartNoAxesCombined },
    ],
  },
  {
    id: 'seguridad', label: 'Seguridad', Icon: ShieldCheck,
    children: [
      { id: 'empleados', label: 'Empleados', Icon: IdCard },
      { id: 'usuarios',  label: 'Usuarios',  Icon: KeyRound },
      { id: 'roles',     label: 'Roles',     Icon: UserCog },
      { id: 'auditoria', label: 'Bitácora',  Icon: History },
    ],
  },
]

/* En touch/pantallas angostas no hay hover, así que el sidebar arranca
   colapsado para no comerse la pantalla (mismo criterio que el @media). */
const startsCompact = () =>
  window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900

function App() {
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion())
  const [openTabs, setOpenTabs] = useState<ModuleKey[]>([])
  const [activeTab, setActiveTab] = useState<ModuleKey | null>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(() => !startsCompact())
  const [pinned, setPinned] = useState(() => !startsCompact())
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [commands, setCommands] = useState<Record<ModuleKey, ModuleCommand>>({
    gastos: { id: 0, action: 'table' },
    ventas: { id: 0, action: 'table' },
    facturacion: { id: 0, action: 'table' },
    clientes: { id: 0, action: 'table' },
    productos: { id: 0, action: 'table' },
    catalogo: { id: 0, action: 'table' },
    inventario: { id: 0, action: 'table' },
    consumos: { id: 0, action: 'table' },
    resultados: { id: 0, action: 'table' },
    empleados: { id: 0, action: 'table' },
    usuarios: { id: 0, action: 'table' },
    roles: { id: 0, action: 'table' },
    auditoria: { id: 0, action: 'table' },
  })

  const openModule = (module: ModuleKey, action: ModuleAction = 'table') => {
    setOpenTabs((prev) => (prev.includes(module) ? prev : [...prev, module]))
    setActiveTab(module)
    setCommands((prev) => ({
      ...prev,
      [module]: { id: prev[module].id + 1, action },
    }))
  }

  const closeTab = (module: ModuleKey) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(module)
      const next = prev.filter((t) => t !== module)
      if (activeTab === module) setActiveTab(next[idx] ?? next[idx - 1] ?? null)
      return next
    })
  }

  const goHome = () => setActiveTab(null)

  const handleLogin = (nuevaSesion: Sesion) => {
    localStorage.setItem(SESION_KEY, JSON.stringify(nuevaSesion))
    setSesion(nuevaSesion)
  }

  const handleLogout = () => {
    apiFetch('/api/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem(SESION_KEY)
    setSesion(null)
  }

  const togglePin = () => {
    const next = !expanded
    setExpanded(next)
    setPinned(next)
  }

  // Tocar el logo con el sidebar colapsado lo abre y lo fija (en touch no hay
  // hover que lo abra); el botón de pin ya cubre cerrarlo.
  const onLogoTap = () => { if (!expanded) setExpanded(true) }
  const closeMobile = () => { setPinned(false); setExpanded(false) }

  const toggleGroup = (groupId: string) => {
    if (!expanded) setExpanded(true)
    setOpenGroups((prev) => (prev.includes(groupId) ? [] : [groupId]))
  }

  // Al navegar en mobile hay que cerrar el overlay para ver el módulo elegido;
  // en desktop "pinned" significa que el usuario quiere el menú abierto.
  const navigate = (module: ModuleKey, action: ModuleAction = 'table') => {
    openModule(module, action)
    if (startsCompact()) closeMobile()
  }

  useEffect(() => {
    const onOpenTab = (ev: Event) => {
      const customEvent = ev as CustomEvent<{ module?: ModuleKey; action?: ModuleAction }>
      const module = customEvent.detail?.module
      const action = customEvent.detail?.action ?? 'table'
      if (module) openModule(module, action)
    }

    window.addEventListener('erp-open-tab', onOpenTab)
    return () => window.removeEventListener('erp-open-tab', onOpenTab)
  }, [])

  useEffect(() => {
    const onSesionExpirada = () => {
      localStorage.removeItem(SESION_KEY)
      setSesion(null)
    }
    window.addEventListener(SESION_EXPIRADA_EVENT, onSesionExpirada)
    return () => window.removeEventListener(SESION_EXPIRADA_EVENT, onSesionExpirada)
  }, [])

  const tabContent = useMemo(
    () => ({
      gastos: <GastosModule command={commands.gastos} />,
      ventas: <VentasModule command={commands.ventas} />,
      facturacion: <FacturacionModule command={commands.facturacion} />,
      clientes: <ClientesModule command={commands.clientes} />,
      productos: <ProductosModule command={commands.productos} />,
      catalogo: <CatalogoModule />,
      inventario: <InventarioModule command={commands.inventario} />,
      consumos: <ConsumosModule command={commands.consumos} />,
      resultados: <ResultadosModule command={commands.resultados} />,
      empleados: <EmpleadosModule command={commands.empleados} />,
      usuarios: <UsuariosModule command={commands.usuarios} />,
      roles: <RolesModule command={commands.roles} />,
      auditoria: <AuditoriaModule />,
    }),
    [commands],
  )

  if (!sesion) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <PermissionsProvider permisos={sesion.permisos}>
      <div className="erp-body">
        {expanded && <div className="erp-sidebar-backdrop" onClick={closeMobile} />}

        {/* ─── SIDEBAR ─── */}
        <aside
          ref={sidebarRef}
          className={`erp-sidebar ${expanded ? 'erp-sidebar--expanded' : ''}`}
        >
          <div className="erp-sidebar-header">
            <div className="erp-logo-row" onClick={onLogoTap}>
              <img src="/reme-logo.png" alt="REME" className="erp-logo-icon" />
              <div className={`erp-logo-wrap ${expanded ? 'erp-logo-wrap--visible' : ''}`}>
                <p className="erp-logo-wordmark">REME</p>
              </div>
            </div>
            <button
              onClick={togglePin}
              className={`erp-pin-btn ${pinned ? 'erp-pin-btn--active' : ''}`}
              title={expanded ? 'Contraer menú' : 'Expandir menú'}
              aria-label={expanded ? 'Contraer menú' : 'Expandir menú'}
            >
              {expanded ? <Minimize2 size={16} /> : <Expand size={16} />}
            </button>
          </div>

          <nav className="erp-nav">
            {MENU_ITEMS.map((item) => {
              // El backend ya rechaza estas rutas sin permiso de "ver", pero
              // mostrarlas igual en el menú invita a abrir un módulo vacío;
              // se ocultan acá para que el menú refleje lo que el usuario
              // realmente puede ver.
              const children = item.children.filter((child) => sesion.permisos[PERMISO_DEL_MODULO[child.id]]?.ver)
              if (children.length === 0) return null

              const isOpen = openGroups.includes(item.id)
              return (
                <div key={item.id} className="erp-nav-group">
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="erp-nav-item"
                  >
                    <item.Icon size={16} className="erp-nav-icon" />
                    {expanded && <span className="erp-nav-label">{item.label}</span>}
                    {expanded && (
                      <span
                        role="button"
                        aria-label={isOpen ? `Contraer ${item.label}` : `Expandir ${item.label}`}
                        aria-expanded={isOpen}
                        className="erp-nav-arrow-btn"
                      >
                        {isOpen
                          ? <ChevronDown size={11} className="erp-nav-arrow" />
                          : <ChevronRight size={11} className="erp-nav-arrow" />}
                      </span>
                    )}
                  </button>

                  {expanded && isOpen && (
                    <div className="erp-nav-children">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => navigate(child.id)}
                          className={`erp-nav-child ${activeTab === child.id ? 'erp-nav-child--active' : ''}`}
                        >
                          <child.Icon size={13} className="erp-nav-child-icon" />
                          <span>{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="erp-sidebar-footer">
            <div className="erp-footer-user">
              <div className="erp-avatar" title={`${sesion.nombre} · ${sesion.rol ?? ''}`}>
                {sesion.nombre.charAt(0)}
              </div>
              <div className={`erp-footer-user-wrap ${expanded ? 'erp-footer-user-wrap--visible' : ''}`}>
                <p className="erp-footer-user-name">{sesion.nombre.split(' ')[0]}</p>
                <p className="erp-footer-user-role">{sesion.rol ?? ''}</p>
              </div>
            </div>
            {expanded && (
              <button className="erp-footer-logout-btn" onClick={handleLogout} title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </aside>

        {/* ─── COLUMNA DERECHA ─── */}
        <div className="erp-right-col">
          {/* Bloque encabezado */}
          <div className="erp-header-block">
            <header className="erp-topbar">
              <div className="erp-topbar-greeting">
                Hola! <strong>{sesion.nombre.split(' ')[0]}</strong>
              </div>
              <div className="erp-topbar-right">
                <div className="erp-topbar-group">
                  <div className="erp-topbar-search">
                    <Search size={14} />
                    <input placeholder="Buscar módulo o acción" />
                  </div>
                </div>
              </div>
            </header>

            <div className="erp-tab-bar">
              <button
                className={`erp-tab-home ${activeTab === null ? 'erp-tab-home--active' : ''}`}
                onClick={goHome}
                title="Inicio"
              >
                <Home size={16} />
              </button>
              <div className="erp-tabs-container">
                {openTabs.map((tab) => {
                  const Icon = MODULE_ICONS[tab]
                  return (
                    <div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`erp-tab ${activeTab === tab ? 'erp-tab--active' : ''}`}
                    >
                      <Icon size={13} className="erp-tab-icon" />
                      <span className="erp-tab-label">{MODULE_TITLES[tab]}</span>
                      <button
                        className="erp-tab-close"
                        onClick={(e) => { e.stopPropagation(); closeTab(tab) }}
                        title="Cerrar"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bloque contenido */}
          <main className="erp-content">
            {activeTab === null && (
              <div className="erp-panel erp-panel--active">
                <div className="erp-home">
                  <div className="erp-welcome-card">
                    <div className="erp-welcome-logo">
                      <img src="/reme-logo.png" alt="REME" className="erp-logo-box" />
                    </div>
                    <hr className="erp-welcome-divider" />
                    <h1 className="erp-welcome-title">Bienvenido</h1>
                    <p className="erp-welcome-sub">
                      Panel operativo de REME — gastos, ventas, facturación, clientes,
                      catálogo, inventario y estado de resultados.
                    </p>
                  </div>
                  <ResumenGeneral onAbrir={(module) => navigate(module)} />
                </div>
              </div>
            )}

            {/* Los módulos se mantienen montados para no perder su estado al cambiar de pestaña */}
            {openTabs.map((tab) => (
              <div
                key={tab}
                className={`erp-panel erp-panel--full ${activeTab === tab ? 'erp-panel--active' : ''}`}
              >
                {tabContent[tab]}
              </div>
            ))}
          </main>
        </div>
      </div>
    </PermissionsProvider>
  )
}

export default App

# REME Crochet — Frontend

React + TypeScript + Vite. Panel operativo del ERP: pedidos, gastos,
facturación, clientes, catálogo, inventario y resultados.

```bash
npm install
npm run dev       # http://localhost:5173 — proxy de /api hacia :3001 (ver vite.config.ts)
```

El backend (`../backend`) tiene que estar corriendo aparte. En desarrollo no
hace falta ningún `.env`: Vite ya redirige `/api` al backend local. Para
producción con frontend y backend en dominios distintos, ver `.env.example`
(`VITE_API_URL`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | `tsc -b` + build de producción a `dist/` |
| `npm test` | Tests con Vitest + Testing Library (`*.test.tsx` junto a cada componente) |
| `npm run lint` | Oxlint |
| `npm run preview` | Sirve `dist/` en local para probar el build |
| `npm start` | `serve -s dist` — lo que corre en producción |

## Estructura

```
src/
  App.tsx                  layout, sidebar, tabs y filtrado del menú por permiso
  components/               Login, CrudModule (tabla+formulario genéricos), ResumenGeneral, ...
  modules/                   un componente por módulo de negocio (Ventas, Gastos, Clientes, ...)
  context/PermissionsContext  can(modulo, accion) a partir de los permisos del rol logueado
  utils/api.ts                fetch con Authorization: Bearer <token> y logout automático en 401
  utils/session.ts            lectura/escritura de la sesión en localStorage
  test/setup.ts                jest-dom + cleanup de Testing Library entre tests
```

## Autenticación

La sesión (incluida la matriz de permisos del rol) llega de `POST /api/login`
y se guarda en `localStorage`. `apiFetch()` la adjunta en cada request y, si
el backend responde 401 (token vencido o revocado por un logout), dispara un
evento que `App.tsx` escucha para cerrar sesión y volver al login.

El sidebar y el panel de inicio (`ResumenGeneral`) solo muestran los módulos
que el rol logueado puede ver — el backend igual los rechaza sin permiso,
pero mostrarlos invitaría a abrir una pantalla vacía.

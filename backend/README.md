# REME Crochet — Backend ERP

Express + PostgreSQL. Autenticación con JWT real (nada de headers editables
desde el navegador).

```bash
npm install
cp .env.example .env    # completar PGPASSWORD y JWT_SECRET
npm run db:setup        # crea la base "reme" si no existe
npm run dev              # node --watch — migra y siembra solo al arrancar
npm start                 # http://localhost:3001
```

Variables (`backend/.env`, ver `.env.example`): `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE`, `JWT_SECRET` (obligatoria — el backend no arranca
sin ella). Opcionales: `PORT` (3001), `FRONTEND_URL` (http://localhost:5173).

También se puede levantar todo (Postgres incluido) con Docker — ver
`docker-compose.yml` en la raíz del repo.

## Módulos

Ventas (pedidos), Gastos, Clientes, Facturación, Productos, Inventario
(+ consumos), Resultados, Empleados, Usuarios, Roles, Auditoría.

## Autenticación

`POST /api/login` con `{ usuario, password }` devuelve un JWT (12h de
vigencia) que el frontend manda en `Authorization: Bearer <token>` en cada
request. El rol y usuario del solicitante salen del token firmado — nunca de
algo que mande el cliente sin firmar.

`POST /api/logout` no puede "borrar" un JWT (es stateless por diseño), pero sí
invalida al instante cualquier token de ese usuario firmado antes del logout
— un contador de versión en memoria, por usuario (`src/utils/token.js`), se
graba en el propio token al firmarlo y se incrementa al cerrar sesión. Un
login inmediatamente posterior firma con la versión nueva y sigue sirviendo.
Como es en memoria, un reinicio del backend "revierte" los logouts pendientes
(el token igual expira solo a las 12h).

`POST /api/login` tiene rate limiting: 10 intentos cada 15 minutos por IP
(`express-rate-limit`), para frenar fuerza bruta.

No hay recuperación de contraseña por correo — con pocos usuarios internos,
un ADMIN resetea con `PUT /usuarios/:id/password` (sin `password_actual`).

## Permisos

| Módulos | `ventas` `gastos` `clientes` `facturacion` `productos` `codigos` `inventario` `resultados` `empleados` `usuarios` `roles` `auditoria` |
|---|---|
| Acciones | `ver` `crear` `editar` `eliminar` `imprimir` `exportar` `aprobar` |

Cada acción es un toggle independiente, no una jerarquía. La acción exigida se
deduce del verbo HTTP: GET→`ver`, POST→`crear`, DELETE→`eliminar`, PUT/PATCH→`editar`.
La matriz vive en la tabla `permisos_rol` y se cachea en memoria al arrancar
(`src/middleware/permisos.js`) para no pagar un roundtrip a la BD por request.

Roles sembrados: **ADMIN** (todo), **GERENTE** (todo menos empleados/usuarios/roles/auditoría),
**VENDEDOR** (ventas y clientes completos; productos, códigos e inventario solo lectura).

## Endpoints

Todos bajo `/api`. `GET /api/health` → estado y conteo de registros.
`GET /api/resumen` → conteos por módulo para las tarjetas del panel de
inicio del frontend, filtrados por lo que el rol del solicitante puede ver.

### Empleados
| Método | Ruta | Notas |
|---|---|---|
| GET | `/empleados` | Ordenado por nombre |
| GET | `/empleados/:id` | |
| POST | `/empleados` | `dni` obligatorio con formato `0000-0000-00000` |
| PUT | `/empleados/:id` | Actualización parcial |
| DELETE | `/empleados/:id` | 409 si tiene un usuario asociado |

Campos: `id_empleado`, `dni`, `nombre`, `telefono`, `correo`, `cargo`, `estado`, `fecha_ingreso`.
El nombre y el cargo se guardan en mayúsculas; el correo en minúsculas.

### Usuarios
| Método | Ruta | Notas |
|---|---|---|
| GET | `/usuarios` | Incluye `rol` y `empleado` resueltos por nombre |
| GET | `/usuarios/:id` | |
| POST | `/usuarios` | `password` mínimo 8 caracteres; login = DNI del empleado vinculado |
| PUT | `/usuarios/:id` | Actualización parcial |
| PUT | `/usuarios/:id/password` | Con `password_actual` la verifica; sin ella es reset de admin |
| DELETE | `/usuarios/:id` | 409 si es el último administrador activo |

Campos: `id_usuario`, `usuario`, `nombre`, `correo`, `id_empleado`, `id_rol`, `estado`, `ultimo_acceso`.
El `password_hash` **nunca** se devuelve. Se guarda con `scrypt` del core de Node
(formato `scrypt$salt$hash`), sin dependencias externas.

### Roles y permisos
| Método | Ruta | Notas |
|---|---|---|
| GET | `/roles` | Incluye conteo de `usuarios` por rol |
| GET | `/roles/catalogo` | `{ modulos, acciones }` para armar la pantalla de permisos |
| GET | `/roles/:id` | |
| POST | `/roles` | Nace sin permisos |
| PUT | `/roles/:id` | ADMIN no se puede desactivar |
| DELETE | `/roles/:id` | 409 si está en uso o es ADMIN |
| GET | `/roles/:id/permisos` | Devuelve **todos los módulos**, con `false` los no asignados |
| PUT | `/roles/:id/permisos` | Body `{ permisos: [{ modulo, ver, crear, ... }] }`; ADMIN protegido |

### Ventas, catálogo, finanzas

`productos`, `clientes`, `pedidos` (+ `/pedidos/:id/finalizar`), `facturacion`
(derivada de pedidos finalizados), `gastos`, `inventario` + `consumos`,
`resultados/resumen` (ingresos, egresos y ganancia estimada) y `auditoria`
(bitácora de acciones). Cada ruta exige el permiso del módulo correspondiente
— ver `src/routes/`.

## Credenciales sembradas

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `ana` | `ana123` | VENDEDOR |
| `demo` | `reme2026` | ADMIN |

> Son de desarrollo, solo se siembran si la tabla `usuarios` está vacía.

## Tests

```bash
npm test
```

`node --test` con auto-discovery (`test/*.test.js`). Son tests de integración
reales contra Postgres — necesitan la base migrada y sembrada (`npm run dev`
al menos una vez, o `node scripts/preparar-db.mjs` en CI). Cubren rutas
protegidas, cálculo de pedidos, y casos de auth (password incorrecto, usuario
inactivo, rate limiting del login, revocación de sesión al hacer logout).

## Estructura

```
src/
  index.js                  app, CORS, health, montaje de rutas, 404 y errores
  middleware/permisos.js    MODULOS, ACCIONES, matriz y requirePermission
  routes/                   auth · empleados · usuarios · roles · productos ·
                             clientes · pedidos · facturacion · resultados ·
                             resumen · gastos · inventario · auditoria
  store/db.js                acceso genérico a Postgres (list/find/insert/update/remove)
  store/inicializar.js       migraciones + seed, compartido por index.js y scripts/preparar-db.mjs
  store/migrar.js             corre migrations/*.sql pendientes
  store/seed.js · catalogo.js datos iniciales
  utils/password.js           hash y verificación con scrypt
  utils/token.js               firma/verifica JWT y revocación de sesión por logout
migrations/                  *.sql, uno por cambio de esquema, se aplican en orden y una sola vez
scripts/                     setup-db · migrate · check-db · preparar-db (CI)
```

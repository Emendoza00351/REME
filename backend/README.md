# REME Crochet — Backend ERP

Express + almacenamiento **en memoria**. No hay base de datos todavía: los datos
viven en el proceso y vuelven a la semilla en cada reinicio.

```bash
npm install
npm run dev      # node --watch
npm start        # http://localhost:3001
```

Variables opcionales: `PORT` (3001), `FRONTEND_URL` (http://localhost:5173).

## Módulos

Empleados, Usuarios y Roles (con matriz de permisos).

## Permisos

Todavía no hay login. El rol del solicitante se toma del header **`x-rol-id`**;
si no viene, se asume el rol 1 (ADMIN). Al conectar la autenticación, lo único
que cambia es `resolverRol()` en `src/middleware/permisos.js`.

| Módulos | `ventas` `gastos` `clientes` `facturacion` `productos` `codigos` `inventario` `resultados` `empleados` `usuarios` `roles` |
|---|---|
| Acciones | `ver` `crear` `editar` `eliminar` `imprimir` `exportar` `aprobar` |

Cada acción es un toggle independiente, no una jerarquía. La acción exigida se
deduce del verbo HTTP: GET→`ver`, POST→`crear`, DELETE→`eliminar`, PUT/PATCH→`editar`.

Roles sembrados: **ADMIN** (todo), **GERENTE** (todo menos empleados/usuarios/roles),
**VENDEDOR** (ventas y clientes completos; productos, códigos e inventario solo lectura).

## Endpoints

Todos bajo `/api`.

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
| POST | `/usuarios` | `password` mínimo 8 caracteres |
| PUT | `/usuarios/:id` | No cambia la contraseña |
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
| GET | `/roles/:id/permisos` | Devuelve **los 11 módulos**, con `false` los no asignados |
| PUT | `/roles/:id/permisos` | Body `{ permisos: [{ modulo, ver, crear, ... }] }`; ADMIN protegido |

### Salud
`GET /api/health` → estado y conteo de registros.

## Credenciales sembradas

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `ana` | `ana123` | VENDEDOR |

> Son de desarrollo. Cuando exista login real hay que reemplazarlas.

## Estructura

```
src/
  index.js                app, CORS, health, montaje de rutas, 404 y errores
  middleware/permisos.js  MODULOS, ACCIONES, matriz y requirePermission
  routes/                 empleados.js · usuarios.js · roles.js
  store/db.js             tabla genérica en memoria (list/find/insert/update/remove)
  store/seed.js           datos iniciales y matriz de permisos por rol
  utils/password.js       hash y verificación con scrypt
```

Para migrar a Postgres: reemplazar `store/db.js` por el pool real manteniendo la
misma API de tabla. Las rutas no deberían cambiar.

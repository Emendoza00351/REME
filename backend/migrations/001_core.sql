-- 001_core.sql
-- roles, empleados, usuarios, permisos_rol, clientes, auditoria
-- roles/empleados/usuarios se auto-referencian entre sí para las columnas de
-- auditoría (creado_por/actualizado_por), así que esas FK se agregan con
-- ALTER TABLE una vez que las tres tablas ya existen.

CREATE TABLE roles (
  id_rol SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion VARCHAR(200),
  estado VARCHAR(10) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por INTEGER,
  actualizado_por INTEGER,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE TABLE empleados (
  id_empleado SERIAL PRIMARY KEY,
  dni VARCHAR(15) UNIQUE NOT NULL CHECK (dni ~ '^\d{4}-\d{4}-\d{5}$'),
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(20),
  correo VARCHAR(120) UNIQUE,
  cargo VARCHAR(60),
  estado VARCHAR(10) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  fecha_ingreso DATE,
  creado_por INTEGER,
  actualizado_por INTEGER,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE TABLE usuarios (
  id_usuario SERIAL PRIMARY KEY,
  usuario VARCHAR(20) UNIQUE NOT NULL CHECK (usuario ~ '^[a-z0-9._-]{3,20}$'),
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(120) UNIQUE NOT NULL,
  id_empleado INTEGER REFERENCES empleados (id_empleado) ON DELETE RESTRICT,
  id_rol INTEGER NOT NULL REFERENCES roles (id_rol) ON DELETE RESTRICT,
  estado VARCHAR(10) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  password_hash TEXT NOT NULL,
  ultimo_acceso TIMESTAMPTZ,
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

ALTER TABLE empleados
  ADD CONSTRAINT fk_empleados_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id_usuario),
  ADD CONSTRAINT fk_empleados_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios (id_usuario);

ALTER TABLE roles
  ADD CONSTRAINT fk_roles_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id_usuario),
  ADD CONSTRAINT fk_roles_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios (id_usuario);

CREATE TABLE permisos_rol (
  id_rol INTEGER NOT NULL REFERENCES roles (id_rol) ON DELETE CASCADE,
  modulo VARCHAR(30) NOT NULL CHECK (
    modulo IN (
      'ventas', 'gastos', 'clientes', 'facturacion', 'productos',
      'codigos', 'inventario', 'resultados', 'empleados', 'usuarios', 'roles'
    )
  ),
  ver BOOLEAN NOT NULL DEFAULT false,
  crear BOOLEAN NOT NULL DEFAULT false,
  editar BOOLEAN NOT NULL DEFAULT false,
  eliminar BOOLEAN NOT NULL DEFAULT false,
  imprimir BOOLEAN NOT NULL DEFAULT false,
  exportar BOOLEAN NOT NULL DEFAULT false,
  aprobar BOOLEAN NOT NULL DEFAULT false,
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ,
  PRIMARY KEY (id_rol, modulo)
);

CREATE TABLE clientes (
  id_cliente SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(20),
  app VARCHAR(20),
  direccion VARCHAR(200),
  cp_frecuente INTEGER,
  estado_ultimo_pedido VARCHAR(15) CHECK (estado_ultimo_pedido IN ('entregado', 'pendiente')),
  tipo_pago VARCHAR(15) NOT NULL CHECK (tipo_pago IN ('Banco', 'Efectivo')),
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE TABLE auditoria (
  id_auditoria BIGSERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
  tabla VARCHAR(30) NOT NULL,
  id_registro INTEGER NOT NULL,
  accion VARCHAR(10) NOT NULL CHECK (accion IN ('crear', 'editar', 'eliminar')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_tabla_registro ON auditoria (tabla, id_registro);
CREATE INDEX idx_auditoria_usuario ON auditoria (id_usuario);
CREATE INDEX idx_usuarios_id_rol ON usuarios (id_rol);
CREATE INDEX idx_usuarios_id_empleado ON usuarios (id_empleado);
CREATE INDEX idx_empleados_creado_por ON empleados (creado_por);
CREATE INDEX idx_clientes_creado_por ON clientes (creado_por);

-- 002_productos_pedidos_inventario.sql
-- Catálogo y operación del negocio: productos, pedidos y control de inventario.

CREATE TABLE productos (
  id_producto SERIAL PRIMARY KEY,
  cproducto INTEGER UNIQUE NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  mano_obra NUMERIC(12,2) NOT NULL DEFAULT 0,
  materiales NUMERIC(12,2) NOT NULL DEFAULT 0,
  empaque NUMERIC(12,2) NOT NULL DEFAULT 0,
  otros NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_materiales NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_produccion NUMERIC(12,2) NOT NULL DEFAULT 0,
  ganancia NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado VARCHAR(10) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE TABLE pedidos (
  id_pedido SERIAL PRIMARY KEY,
  fecha_pedido DATE NOT NULL,
  id_cliente INTEGER NOT NULL REFERENCES clientes (id_cliente) ON DELETE RESTRICT,
  cliente VARCHAR(120) NOT NULL,
  cp INTEGER,
  producto VARCHAR(200) NOT NULL,
  color VARCHAR(80),
  descripcion TEXT,
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
  precio_unidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tiempo_dias INTEGER,
  fecha_entrega DATE,
  app VARCHAR(30),
  direccion VARCHAR(200),
  estado VARCHAR(15) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'entregado')),
  tipo_pago VARCHAR(15) NOT NULL DEFAULT 'Banco' CHECK (tipo_pago IN ('Banco', 'Efectivo')),
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE TABLE inventario (
  id_inventario SERIAL PRIMARY KEY,
  marca VARCHAR(80) NOT NULL,
  color VARCHAR(80) NOT NULL,
  gr_10 NUMERIC(12,2) NOT NULL DEFAULT 0,
  gr_50 NUMERIC(12,2) NOT NULL DEFAULT 0,
  gr_100 NUMERIC(12,2) NOT NULL DEFAULT 0,
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado VARCHAR(10) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE INDEX idx_productos_cproducto ON productos (cproducto);
CREATE INDEX idx_pedidos_id_cliente ON pedidos (id_cliente);
CREATE INDEX idx_pedidos_estado ON pedidos (estado);
CREATE INDEX idx_inventario_marca_color ON inventario (marca, color);

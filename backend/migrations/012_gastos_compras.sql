CREATE TABLE gastos (
  id_gasto SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo_movimiento VARCHAR(25) NOT NULL CHECK (tipo_movimiento IN ('gasto', 'compra_inventario')),
  descripcion VARCHAR(200) NOT NULL,
  codigo_barras VARCHAR(80),
  marca VARCHAR(80),
  color VARCHAR(80),
  codigo_color VARCHAR(80),
  tamano VARCHAR(80),
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
  unidad VARCHAR(30) NOT NULL DEFAULT 'unidad',
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado VARCHAR(15) NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado', 'por pagar')),
  tipo_pago VARCHAR(15) NOT NULL DEFAULT 'efectivo' CHECK (tipo_pago IN ('banco', 'efectivo')),
  id_inventario INTEGER REFERENCES inventario (id_inventario) ON DELETE SET NULL,
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  actualizado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);

CREATE INDEX idx_gastos_fecha ON gastos (fecha);
CREATE INDEX idx_gastos_tipo ON gastos (tipo_movimiento);
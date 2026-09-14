CREATE TABLE consumos_inventario (
  id_consumo SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  id_inventario INTEGER NOT NULL REFERENCES inventario (id_inventario) ON DELETE RESTRICT,
  codigo_barras VARCHAR(80) NOT NULL,
  codigo_pedido INTEGER REFERENCES pedidos (id_pedido) ON DELETE SET NULL,
  producto VARCHAR(200) NOT NULL,
  peso_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  peso_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  peso_consumido NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidades_producidas NUMERIC(12,2) NOT NULL DEFAULT 0,
  rollos_consumidos NUMERIC(12,2) NOT NULL DEFAULT 1,
  observacion TEXT,
  creado_por INTEGER REFERENCES usuarios (id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumos_inventario_fecha ON consumos_inventario (fecha);
CREATE INDEX idx_consumos_inventario_producto ON consumos_inventario (producto);
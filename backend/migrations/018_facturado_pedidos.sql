ALTER TABLE pedidos
  ADD COLUMN facturado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN facturado_en TIMESTAMPTZ;

CREATE INDEX idx_pedidos_facturado ON pedidos (facturado);

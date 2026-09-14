ALTER TABLE pedidos
  ADD COLUMN finalizado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN finalizado_en TIMESTAMPTZ,
  ADD COLUMN envio_requerido BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN costo_envio NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX idx_pedidos_finalizado ON pedidos (finalizado);

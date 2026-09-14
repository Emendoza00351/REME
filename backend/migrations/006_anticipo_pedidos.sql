ALTER TABLE pedidos
  ADD COLUMN adelanto NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN estado_anticipo VARCHAR(10) NOT NULL DEFAULT 'pendiente'
    CHECK (estado_anticipo IN ('pendiente', 'pagado'));

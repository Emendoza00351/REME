ALTER TABLE inventario
  ADD COLUMN total_gramos NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE inventario
SET total_gramos = COALESCE(NULLIF(tamano, '')::numeric, 0) * COALESCE(cantidad, 0);
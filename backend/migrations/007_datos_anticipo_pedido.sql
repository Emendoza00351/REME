ALTER TABLE pedidos
  ADD COLUMN descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN anticipo_metodo_pago VARCHAR(20),
  ADD COLUMN anticipo_banco VARCHAR(100);

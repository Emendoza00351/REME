-- 013_consumos_inventario.sql ya crea estas columnas al crear la tabla, así
-- que en una base nueva este ALTER fallaría con "column already exists" y
-- abortaría el arranque del backend (ejecutarMigracionesPendientes corta en
-- el primer error). IF NOT EXISTS lo vuelve idempotente para ambos casos:
-- bases viejas que necesitaban este ALTER y bases nuevas que ya las tienen.
ALTER TABLE consumos_inventario
  ADD COLUMN IF NOT EXISTS codigo_pedido INTEGER REFERENCES pedidos (id_pedido) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS peso_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS peso_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS peso_consumido NUMERIC(12,2) NOT NULL DEFAULT 0;

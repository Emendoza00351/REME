-- 003_bitacora_y_ajustes.sql
-- Ajustes para conectar el backend (antes en memoria) a esta base real:
--   * productos.foto_url — el catálogo visual ya lo usaba en memoria.
--   * auditoria — se amplía de "solo cambios de datos" a bitácora general
--     (incluye login/logout y no siempre hay tabla/registro puntual).
--   * permisos_rol — el módulo "auditoria" (bitácora) es nuevo.

ALTER TABLE productos ADD COLUMN foto_url TEXT;

ALTER TABLE auditoria ALTER COLUMN tabla DROP NOT NULL;
ALTER TABLE auditoria ALTER COLUMN id_registro DROP NOT NULL;
ALTER TABLE auditoria RENAME COLUMN tabla TO modulo;
ALTER TABLE auditoria RENAME COLUMN id_registro TO registro_id;
ALTER TABLE auditoria ADD COLUMN metodo VARCHAR(10);
ALTER TABLE auditoria ADD COLUMN ruta VARCHAR(200);
ALTER TABLE auditoria ADD COLUMN estado VARCHAR(10);
ALTER TABLE auditoria ADD COLUMN codigo_http INTEGER;

ALTER TABLE auditoria DROP CONSTRAINT auditoria_accion_check;
ALTER TABLE auditoria ADD CONSTRAINT auditoria_accion_check CHECK (
  accion IN ('crear', 'editar', 'eliminar', 'login', 'login_fallido', 'login_bloqueado', 'logout')
);

ALTER TABLE permisos_rol DROP CONSTRAINT permisos_rol_modulo_check;
ALTER TABLE permisos_rol ADD CONSTRAINT permisos_rol_modulo_check CHECK (
  modulo IN (
    'ventas', 'gastos', 'clientes', 'facturacion', 'productos',
    'codigos', 'inventario', 'resultados', 'empleados', 'usuarios', 'roles', 'auditoria'
  )
);

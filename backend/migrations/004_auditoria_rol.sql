-- 004_auditoria_rol.sql
-- Guarda el rol que tenía el usuario AL MOMENTO del evento (no el actual),
-- para que la bitácora sea fiel incluso si después se le cambia el rol.
ALTER TABLE auditoria ADD COLUMN id_rol INTEGER REFERENCES roles (id_rol);

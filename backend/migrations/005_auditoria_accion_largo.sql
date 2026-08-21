-- 005_auditoria_accion_largo.sql
-- 001_core.sql definió accion como VARCHAR(10), pero 003_bitacora_y_ajustes.sql
-- amplió el CHECK para permitir 'login_fallido' (13) y 'login_bloqueado' (16),
-- que no caben. Un intento de login con contraseña incorrecta hacía fallar el
-- INSERT en auditoria y el endpoint devolvía 500 en vez de 401.
ALTER TABLE auditoria ALTER COLUMN accion TYPE VARCHAR(20);
